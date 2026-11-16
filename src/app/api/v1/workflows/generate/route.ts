import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/middleware-helper";
import { generateWorkflowInputSchema } from "@/lib/validations";
import { createErrorResponse, handleZodError } from "@/lib/errors";
import { generateWorkflowFromPrompt } from "@/lib/gemini/client";
import { workflowRepo } from "@/lib/db";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.success) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse(400, "VALIDATION_ERROR", "Invalid JSON request body");
  }

  const parseResult = generateWorkflowInputSchema.safeParse(body);
  if (!parseResult.success) {
    return handleZodError(parseResult.error);
  }

  const { prompt, save } = parseResult.data;

  let generated;
  try {
    generated = await generateWorkflowFromPrompt(prompt);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return createErrorResponse(
      502,
      "GEMINI_ERROR",
      `Gemini workflow generation failed: ${message}`
    );
  }

  if (save) {
    try {
      const saved = await workflowRepo.create({
        api_key_id: auth.apiKey.id,
        name: generated.name,
        description: generated.description,
        prompt,
        steps: generated.steps,
      });

      // Dispatch workflow.created webhook event
      await dispatchWebhookEvent(
        "workflow.created",
        {
          workflow_id: saved.id,
          name: saved.name,
          description: saved.description,
          steps_count: saved.steps.length,
          created_at: saved.created_at,
        },
        auth.apiKey.id
      );

      return NextResponse.json(saved, { status: 201 });
    } catch (dbErr: unknown) {
      const message = dbErr instanceof Error ? dbErr.message : String(dbErr);
      return createErrorResponse(500, "DATABASE_ERROR", message);
    }
  }

  return NextResponse.json(generated, { status: 200 });
}
