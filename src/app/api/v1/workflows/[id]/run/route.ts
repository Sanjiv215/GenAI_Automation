import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/middleware-helper";
import { workflowRepo, runRepo } from "@/lib/db";
import { runWorkflowInputSchema } from "@/lib/validations";
import { createErrorResponse, handleZodError } from "@/lib/errors";
import { executeWorkflowRun } from "@/lib/engine/executor";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(req);
  if (!auth.success) return auth.response;

  const { id } = params;
  const workflow = await workflowRepo.getById(id, auth.apiKey.id);

  if (!workflow) {
    return createErrorResponse(404, "NOT_FOUND", `Workflow with id '${id}' not found`);
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // Default to empty input object if body is missing
    body = { input: {} };
  }

  const parseResult = runWorkflowInputSchema.safeParse(body);
  if (!parseResult.success) {
    return handleZodError(parseResult.error);
  }

  const inputData = parseResult.data.input as Record<string, unknown>;

  try {
    const run = await runRepo.create({
      workflow_id: workflow.id,
      status: "pending",
      input: inputData,
      step_results: [],
      output: null,
      error: null,
      started_at: null,
      finished_at: null,
    });

    const isSync = req.nextUrl.searchParams.get("sync") === "true";

    if (isSync) {
      const finishedRun = await executeWorkflowRun(
        run.id,
        workflow,
        inputData,
        auth.apiKey.id
      );
      return NextResponse.json(finishedRun, { status: 202 });
    }

    // Trigger asynchronous execution in background
    executeWorkflowRun(run.id, workflow, inputData, auth.apiKey.id).catch((err) => {
      console.error(`Background workflow run ${run.id} failed:`, err);
    });

    return NextResponse.json(
      {
        id: run.id,
        run_id: run.id,
        workflow_id: workflow.id,
        status: "pending",
        message: "Workflow run accepted and queued for execution",
        created_at: run.created_at,
      },
      { status: 202 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return createErrorResponse(500, "DATABASE_ERROR", message);
  }
}
