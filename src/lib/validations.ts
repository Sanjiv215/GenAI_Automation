import { z } from "zod";

export const STEP_TYPES = [
  "classify",
  "summarize",
  "extract",
  "draft_email",
  "prioritize",
  "decision",
  "transform",
] as const;

export const stepSchema = z.object({
  id: z.string().min(1, "Step ID is required"),
  type: z.enum(STEP_TYPES),
  title: z.string().min(1, "Step title is required"),
  instruction: z.string().min(1, "Step instruction is required"),
  input_from: z.string().default("input.text"),
  output_key: z.string().min(1, "Output key is required"),
});

export const geminiWorkflowOutputSchema = z.object({
  name: z.string().min(1, "Workflow name is required"),
  description: z.string().default("Automated business process workflow"),
  steps: z.array(stepSchema).min(1, "At least one step is required"),
});

export const generateWorkflowInputSchema = z.object({
  prompt: z
    .string()
    .min(5, "Prompt must be at least 5 characters long")
    .max(10000, "Prompt must not exceed 10,000 characters"),
  save: z.boolean().optional().default(true),
});

export const runWorkflowInputSchema = z.object({
  input: z.union([
    z.record(z.unknown()),
    z.string().max(10000, "Input string must not exceed 10,000 characters").transform((val) => ({ text: val })),
  ]).refine((data) => {
    const serialized = JSON.stringify(data);
    return serialized.length <= 15000;
  }, "Input payload size must not exceed 15KB"),
});

export const createWebhookInputSchema = z.object({
  url: z
    .string()
    .url("A valid HTTP or HTTPS URL is required")
    .max(2048, "URL is too long"),
  events: z
    .array(
      z.enum([
        "workflow.created",
        "run.started",
        "run.completed",
        "run.failed",
      ])
    )
    .min(1, "At least one webhook event must be subscribed"),
});

export const createApiKeyInputSchema = z.object({
  name: z
    .string()
    .min(1, "Key name is required")
    .max(100, "Key name must not exceed 100 characters"),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});
