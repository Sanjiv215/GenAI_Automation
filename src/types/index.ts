export type StepType =
  | "classify"
  | "summarize"
  | "extract"
  | "draft_email"
  | "prioritize"
  | "decision"
  | "transform";

export interface WorkflowStep {
  id: string;
  type: StepType;
  title: string;
  instruction: string;
  input_from: string;
  output_key: string;
}

export interface Workflow {
  id: string;
  api_key_id: string;
  name: string;
  description: string | null;
  prompt: string;
  steps: WorkflowStep[];
  created_at: string;
}

export type RunStatus = "pending" | "running" | "completed" | "failed";

export interface StepResult {
  step_id: string;
  step_title: string;
  step_type: StepType;
  status: "completed" | "failed" | "skipped";
  input: unknown;
  output: unknown;
  duration_ms: number;
  error?: string | null;
}

export interface Run {
  id: string;
  workflow_id: string;
  status: RunStatus;
  input: Record<string, unknown>;
  step_results: StepResult[];
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export type WebhookEvent =
  | "workflow.created"
  | "run.started"
  | "run.completed"
  | "run.failed";

export interface Webhook {
  id: string;
  api_key_id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  attempt: number;
  success: boolean;
  created_at: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}
