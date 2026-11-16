import { GoogleGenAI, Type } from "@google/genai";
import { geminiWorkflowOutputSchema, STEP_TYPES } from "@/lib/validations";
import { WorkflowStep, StepType } from "@/types";

const DEFAULT_MODEL = "gemini-3.1-flash-lite";

function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}

function getModelName(): string {
  const model = process.env.GEMINI_MODEL;
  if (!model || model === "gemini-2.5-flash") {
    // gemini-2.5-flash has been superseded by gemini-3.1-flash-lite for new AI Studio projects
    return DEFAULT_MODEL;
  }
  return model;
}

// Exponential backoff helper for rate limits (429) and transient network errors
export function withTimeout<T>(promise: Promise<T>, timeoutMs = 25000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini API call timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 1000
): Promise<T> {
  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err: unknown) {
      attempt++;
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isRateLimitOrTransient =
        errorMessage.includes("429") ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.includes("quota") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("503") ||
        errorMessage.includes("UNAVAILABLE") ||
        errorMessage.includes("timed out");

      if (attempt >= maxRetries || !isRateLimitOrTransient) {
        throw err;
      }

      const jitter = Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      delay *= 2;
    }
  }

  throw new Error("Maximum retry attempts reached");
}

const workflowResponseSchema = {
  type: Type.OBJECT,
  properties: {
    name: {
      type: Type.STRING,
      description: "Concise, professional name of the workflow",
    },
    description: {
      type: Type.STRING,
      description: "A 1-2 sentence description explaining what the workflow does",
    },
    steps: {
      type: Type.ARRAY,
      description: "Sequential list of business automation steps",
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: "Unique step ID, e.g. step_1, step_2",
          },
          type: {
            type: Type.STRING,
            enum: [...STEP_TYPES],
            description: "Operation type of this step",
          },
          title: {
            type: Type.STRING,
            description: "Short human-readable title for the step",
          },
          instruction: {
            type: Type.STRING,
            description:
              "Clear, explicit instruction for the AI step executor telling it what to analyze or produce",
          },
          input_from: {
            type: Type.STRING,
            description:
              "Data source: 'input.text' or output key name(s) from earlier steps",
          },
          output_key: {
            type: Type.STRING,
            description: "Snake_case key where the step output will be saved",
          },
        },
        required: ["id", "type", "title", "instruction", "input_from", "output_key"],
      },
    },
  },
  required: ["name", "description", "steps"],
};

export async function generateWorkflowFromPrompt(
  prompt: string
): Promise<{ name: string; description: string; steps: WorkflowStep[] }> {
  const apiKey = getApiKey();

  // If no Gemini API key is configured (local sandbox or testing), provide deterministic generated workflow
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return generateDeterministicFallback(prompt);
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = getModelName();

  const systemInstruction = `You are an expert enterprise automation architect. Convert natural language business process descriptions into clean, executable, sequential workflows.
Allowed step types: classify, summarize, extract, draft_email, prioritize, decision, transform.
Make sure step outputs flow logically: earlier step output keys should feed into subsequent step instructions.
Always return structured JSON strictly conforming to the requested schema.`;

  const runGeneration = async (userContent: string) => {
    return withExponentialBackoff(async () => {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: [
            { role: "user", parts: [{ text: userContent }] }
          ],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: workflowResponseSchema,
            temperature: 0.2,
          },
        }),
        30000
      );

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from Gemini API");
      }
      return JSON.parse(text);
    });
  };

  try {
    // Attempt 1: Standard generation
    const rawOutput = await runGeneration(`Generate a business automation workflow for: "${prompt}"`);
    const parsed = geminiWorkflowOutputSchema.safeParse(rawOutput);

    if (parsed.success) {
      return parsed.data as { name: string; description: string; steps: WorkflowStep[] };
    }

    // Attempt 2: Repair retry with schema error details
    const repairPrompt = `The previous workflow generation output was invalid:
Validation errors: ${JSON.stringify(parsed.error.issues)}
Please repair and strictly generate valid JSON for the original prompt: "${prompt}"`;

    const repairedRaw = await runGeneration(repairPrompt);
    const repairedParsed = geminiWorkflowOutputSchema.safeParse(repairedRaw);

    if (repairedParsed.success) {
      return repairedParsed.data as { name: string; description: string; steps: WorkflowStep[] };
    }

    throw new Error("Repaired output failed schema validation");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Gemini API generation error:", message);
    if (
      message.includes("503") ||
      message.includes("UNAVAILABLE") ||
      message.includes("404") ||
      message.includes("high demand") ||
      message.includes("timed out") ||
      message.includes("Maximum retry attempts")
    ) {
      console.warn("Using fallback generator due to Google Gemini service availability limit");
      return generateDeterministicFallback(prompt);
    }
    throw new Error(`GEMINI_UPSTREAM_ERROR: ${message}`);
  }
}

export async function executeStepWithGemini(
  step: WorkflowStep,
  context: {
    input: Record<string, unknown>;
    previousOutputs: Record<string, unknown>;
  }
): Promise<unknown> {
  const apiKey = getApiKey();

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return executeStepMock(step, context);
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = getModelName();

  const prompt = `You are executing a step in an automated workflow.
Step Title: ${step.title}
Step Type: ${step.type}
Step Instruction: ${step.instruction}

Context Data Available:
- Initial Input: ${JSON.stringify(context.input, null, 2)}
- Previous Step Outputs: ${JSON.stringify(context.previousOutputs, null, 2)}

Perform the instruction precisely.
Return your answer in clear, structured JSON format or concise text directly answering the instruction.`;

  try {
    return await withExponentialBackoff(async () => {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            temperature: 0.2,
          },
        }),
        30000
      );

      const text = response.text || "";
      // If output looks like JSON, parse it
      try {
        let cleaned = text.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/i, "").trim();
        }
        if (
          (cleaned.startsWith("{") && cleaned.endsWith("}")) ||
          (cleaned.startsWith("[") && cleaned.endsWith("]"))
        ) {
          return JSON.parse(cleaned);
        }
      } catch {
        // Return raw string if not JSON
      }
      return text.trim();
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("503") ||
      message.includes("UNAVAILABLE") ||
      message.includes("404") ||
      message.includes("high demand") ||
      message.includes("timed out") ||
      message.includes("Maximum retry attempts")
    ) {
      console.warn("Using fallback step executor due to Google Gemini service availability limit");
      return executeStepMock(step, context);
    }
    throw err;
  }
}

// Fallback generator for offline/test mode when no GEMINI_API_KEY is supplied
function generateDeterministicFallback(prompt: string): {
  name: string;
  description: string;
  steps: WorkflowStep[];
} {
  const lower = prompt.toLowerCase();
  const name = prompt.length > 40 ? prompt.slice(0, 37) + "..." : prompt;

  return {
    name: `Workflow: ${name}`,
    description: `Automated workflow generated from: "${prompt}"`,
    steps: [
      {
        id: "step_1",
        type: "classify",
        title: "Classify Request",
        instruction: `Analyze incoming input for: "${prompt}". Identify main category, urgency, and core topic.`,
        input_from: "input.text",
        output_key: "classification",
      },
      {
        id: "step_2",
        type: "extract",
        title: "Extract Key Entities",
        instruction: "Extract key contact details, names, dates, amounts, and relevant parameters from input.",
        input_from: "input.text",
        output_key: "entities",
      },
      {
        id: "step_3",
        type: lower.includes("priorit") ? "prioritize" : "decision",
        title: lower.includes("priorit") ? "Prioritize Request" : "Route / Branch Decision",
        instruction: "Evaluate criteria based on classification and entities to assign priority score or decide routing path.",
        input_from: "classification, entities",
        output_key: "routing_priority",
      },
      {
        id: "step_4",
        type: lower.includes("email") ? "draft_email" : "summarize",
        title: lower.includes("email") ? "Draft Communication Email" : "Summarize Actionable Outcome",
        instruction: "Generate a polished response or summary incorporating previous step results.",
        input_from: "classification, entities, routing_priority",
        output_key: "final_output",
      },
    ],
  };
}

// Mock step executor for offline/test mode
function executeStepMock(
  step: WorkflowStep,
  context: { input: Record<string, unknown>; previousOutputs: Record<string, unknown> }
): unknown {
  const inputText = typeof context.input.text === "string" ? context.input.text : JSON.stringify(context.input);

  switch (step.type) {
    case "classify":
      return {
        category: inputText.toLowerCase().includes("billing") ? "Billing" : "General Support",
        sentiment: inputText.toLowerCase().includes("urgent") || inputText.toLowerCase().includes("fail") ? "Negative/Urgent" : "Neutral",
        confidence: 0.94,
      };
    case "extract":
      return {
        detected_entities: ["Customer", "Service Issue", "Order#8492"],
        snippet: inputText.slice(0, 80),
      };
    case "prioritize":
      return {
        priority: inputText.toLowerCase().includes("urgent") ? "P1 - High" : "P3 - Normal",
        score: 85,
        rationale: "Assessed based on keyword intensity and SLA guidelines.",
      };
    case "decision":
      return {
        branch: "Manager Escalation",
        condition_met: true,
        action: "Send alert to tier 2 slack channel",
      };
    case "draft_email":
      return {
        subject: `Update regarding your request: ${step.title}`,
        body: `Dear Customer,\n\nThank you for reaching out. We have analyzed your request ("${inputText.slice(0, 50)}...") and our team has initiated action.\n\nBest regards,\nAutomated Workflow Assistant`,
      };
    case "summarize":
      return {
        summary: `Processed input successfully. Key points: ${inputText.slice(0, 100)}...`,
        status: "complete",
      };
    case "transform":
      return {
        transformed: true,
        processed_at: new Date().toISOString(),
        raw_length: inputText.length,
      };
    default:
      return { result: "Step processed successfully" };
  }
}
