import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/middleware-helper";
import { workflowRepo } from "@/lib/db";
import { createErrorResponse, handleZodError } from "@/lib/errors";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";
import { z } from "zod";
import { stepSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

const createManualWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional().default(""),
  prompt: z.string().min(1, "Prompt is required"),
  steps: z.array(stepSchema).min(1, "At least one step is required"),
});

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  const limit = Math.min(Math.max(parseInt(limitParam || "20", 10) || 20, 1), 100);
  const offset = Math.max(parseInt(offsetParam || "0", 10) || 0, 0);

  try {
    const { data, total } = await workflowRepo.list(auth.apiKey.id, limit, offset);
    return NextResponse.json({
      data,
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return createErrorResponse(500, "DATABASE_ERROR", message);
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.success) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse(400, "VALIDATION_ERROR", "Invalid JSON request body");
  }

  const parseResult = createManualWorkflowSchema.safeParse(body);
  if (!parseResult.success) {
    return handleZodError(parseResult.error);
  }

  try {
    const newWorkflow = await workflowRepo.create({
      api_key_id: auth.apiKey.id,
      name: parseResult.data.name,
      description: parseResult.data.description,
      prompt: parseResult.data.prompt,
      steps: parseResult.data.steps,
    });

    await dispatchWebhookEvent(
      "workflow.created",
      {
        workflow_id: newWorkflow.id,
        name: newWorkflow.name,
        description: newWorkflow.description,
        steps_count: newWorkflow.steps.length,
        created_at: newWorkflow.created_at,
      },
      auth.apiKey.id
    );

    return NextResponse.json(newWorkflow, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return createErrorResponse(500, "DATABASE_ERROR", message);
  }
}
