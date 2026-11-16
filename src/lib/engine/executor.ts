import { runRepo } from "@/lib/db";
import { executeStepWithGemini } from "@/lib/gemini/client";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";
import { Run, StepResult, Workflow } from "@/types";

export async function executeWorkflowRun(
  runId: string,
  workflow: Workflow,
  input: Record<string, unknown>,
  apiKeyId: string
): Promise<Run> {
  const startedAt = new Date().toISOString();

  // Update run status to running
  await runRepo.update(runId, {
    status: "running",
    started_at: startedAt,
  });

  // Dispatch run.started webhook
  await dispatchWebhookEvent(
    "run.started",
    {
      run_id: runId,
      workflow_id: workflow.id,
      workflow_name: workflow.name,
      status: "running",
      started_at: startedAt,
      input,
    },
    apiKeyId
  );

  const stepResults: StepResult[] = [];
  const previousOutputs: Record<string, unknown> = {};
  let runFailed = false;
  let failureErrorMessage: string | null = null;

  for (const step of workflow.steps) {
    const stepStartTime = Date.now();

    try {
      const stepOutput = await executeStepWithGemini(step, {
        input,
        previousOutputs,
      });

      const durationMs = Date.now() - stepStartTime;
      previousOutputs[step.output_key] = stepOutput;

      const result: StepResult = {
        step_id: step.id,
        step_title: step.title,
        step_type: step.type,
        status: "completed",
        input: {
          input_from: step.input_from,
        },
        output: stepOutput,
        duration_ms: durationMs,
      };

      stepResults.push(result);

      // Persist incremental step results
      await runRepo.update(runId, {
        step_results: stepResults,
      });
    } catch (stepErr: unknown) {
      runFailed = true;
      const durationMs = Date.now() - stepStartTime;
      failureErrorMessage = stepErr instanceof Error ? stepErr.message : String(stepErr);

      const failedResult: StepResult = {
        step_id: step.id,
        step_title: step.title,
        step_type: step.type,
        status: "failed",
        input: { input_from: step.input_from },
        output: null,
        duration_ms: durationMs,
        error: failureErrorMessage,
      };

      stepResults.push(failedResult);

      // Remaining steps skipped
      break;
    }
  }

  const finishedAt = new Date().toISOString();
  const finalStatus = runFailed ? "failed" : "completed";

  const updatedRun = await runRepo.update(runId, {
    status: finalStatus,
    step_results: stepResults,
    output: runFailed ? null : previousOutputs,
    error: failureErrorMessage,
    finished_at: finishedAt,
  });

  // Dispatch run.completed or run.failed webhook
  const eventName = runFailed ? "run.failed" : "run.completed";
  await dispatchWebhookEvent(
    eventName,
    {
      run_id: runId,
      workflow_id: workflow.id,
      workflow_name: workflow.name,
      status: finalStatus,
      finished_at: finishedAt,
      output: runFailed ? null : previousOutputs,
      error: failureErrorMessage,
    },
    apiKeyId
  );

  return updatedRun!;
}
