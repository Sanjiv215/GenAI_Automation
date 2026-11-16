import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const openApiSpec = {
    openapi: "3.0.3",
    info: {
      title: "Workflow Automation Assistant API",
      version: "1.0.0",
      description:
        "Enterprise GenAI workflow generation and execution engine powered by Gemini 2.5 Flash and Supabase. Supports plain-English workflow generation, structured step execution, HMAC-SHA256 webhooks, and rate-limited API key authentication.",
    },
    servers: [
      {
        url: "/",
        description: "Current environment server",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description:
            "API key authentication header in format `wfa_live_<32 hex chars>`",
        },
      },
      schemas: {
        ErrorPayload: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: {
                  type: "string",
                  example: "VALIDATION_ERROR",
                },
                message: {
                  type: "string",
                  example: "Invalid input provided",
                },
                details: {
                  type: "array",
                  items: { type: "object" },
                },
              },
            },
          },
        },
        WorkflowStep: {
          type: "object",
          required: ["id", "type", "title", "instruction", "input_from", "output_key"],
          properties: {
            id: { type: "string", example: "step_1" },
            type: {
              type: "string",
              enum: [
                "classify",
                "summarize",
                "extract",
                "draft_email",
                "prioritize",
                "decision",
                "transform",
              ],
              example: "classify",
            },
            title: { type: "string", example: "Classify Sentiment and Urgency" },
            instruction: {
              type: "string",
              example: "Analyze input text to identify sentiment and topic category.",
            },
            input_from: { type: "string", example: "input.text" },
            output_key: { type: "string", example: "classification" },
          },
        },
        Workflow: {
          type: "object",
          required: ["id", "api_key_id", "name", "prompt", "steps", "created_at"],
          properties: {
            id: { type: "string", format: "uuid", example: "c56a4180-65aa-42ec-a945-5fd21dec0538" },
            api_key_id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Customer Support Ticket Triage" },
            description: { type: "string", example: "Classify and draft support responses" },
            prompt: { type: "string", example: "When customer emails complaint..." },
            steps: {
              type: "array",
              items: { $ref: "#/components/schemas/WorkflowStep" },
            },
            created_at: { type: "string", format: "date-time" },
          },
        },
        StepResult: {
          type: "object",
          required: ["step_id", "step_title", "step_type", "status", "output", "duration_ms"],
          properties: {
            step_id: { type: "string", example: "step_1" },
            step_title: { type: "string", example: "Classify Sentiment" },
            step_type: { type: "string", example: "classify" },
            status: { type: "string", enum: ["completed", "failed", "skipped"], example: "completed" },
            input: { type: "object" },
            output: { type: "object" },
            duration_ms: { type: "integer", example: 420 },
            error: { type: "string", nullable: true },
          },
        },
        Run: {
          type: "object",
          required: ["id", "workflow_id", "status", "input", "step_results", "created_at"],
          properties: {
            id: { type: "string", format: "uuid" },
            workflow_id: { type: "string", format: "uuid" },
            status: {
              type: "string",
              enum: ["pending", "running", "completed", "failed"],
              example: "completed",
            },
            input: { type: "object" },
            step_results: {
              type: "array",
              items: { $ref: "#/components/schemas/StepResult" },
            },
            output: { type: "object", nullable: true },
            error: { type: "string", nullable: true },
            started_at: { type: "string", format: "date-time", nullable: true },
            finished_at: { type: "string", format: "date-time", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Webhook: {
          type: "object",
          required: ["id", "api_key_id", "url", "events", "is_active", "created_at"],
          properties: {
            id: { type: "string", format: "uuid" },
            api_key_id: { type: "string", format: "uuid" },
            url: { type: "string", format: "uri", example: "https://api.example.com/webhook" },
            events: {
              type: "array",
              items: {
                type: "string",
                enum: ["workflow.created", "run.started", "run.completed", "run.failed"],
              },
            },
            secret: { type: "string", example: "whsec_..." },
            is_active: { type: "boolean", example: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
      },
    },
    paths: {
      "/api/v1/health": {
        get: {
          summary: "Service Health Check",
          description: "Public endpoint checking system and API operational status.",
          responses: {
            200: {
              description: "Service is operational",
              content: {
                "application/json": {
                  example: {
                    status: "ok",
                    version: "1.0.0",
                    service: "Workflow Automation Assistant",
                    timestamp: "2026-11-16T12:00:00.000Z",
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/workflows/generate": {
        post: {
          summary: "Generate Workflow from Natural Language Prompt",
          description:
            "Translates a plain-English process description into a structured, executable workflow using Gemini 2.5 Flash with JSON schema validation. Retries once with error repair on failure.",
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["prompt"],
                  properties: {
                    prompt: {
                      type: "string",
                      example:
                        "When customer emails a complaint, classify the category, prioritize urgency, extract order number, and draft response email.",
                    },
                    save: {
                      type: "boolean",
                      default: true,
                      description: "Whether to save directly to database",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Workflow generated and saved successfully",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Workflow" } } },
            },
            400: {
              description: "Validation error in request body",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorPayload" } } },
            },
            401: { description: "Missing x-api-key header" },
            403: { description: "Invalid or revoked API key" },
            429: { description: "Rate limit exceeded (30 req/min)" },
            502: { description: "Gemini API upstream generation failure" },
          },
        },
      },
      "/api/v1/workflows": {
        get: {
          summary: "List Workflows",
          description: "Retrieve paginated list of workflows owned by the authenticated API key.",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: {
            200: {
              description: "List of workflows",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Workflow" } },
                      pagination: {
                        type: "object",
                        properties: {
                          limit: { type: "integer" },
                          offset: { type: "integer" },
                          total: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: "Create Workflow Directly",
          description: "Create or import a custom workflow with explicit steps.",
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "prompt", "steps"],
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    prompt: { type: "string" },
                    steps: { type: "array", items: { $ref: "#/components/schemas/WorkflowStep" } },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Workflow created",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Workflow" } } },
            },
          },
        },
      },
      "/api/v1/workflows/{id}": {
        get: {
          summary: "Get Workflow Details",
          security: [{ ApiKeyAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: {
              content: { "application/json": { schema: { $ref: "#/components/schemas/Workflow" } } },
            },
            404: { description: "Workflow not found" },
          },
        },
        delete: {
          summary: "Delete Workflow",
          security: [{ ApiKeyAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            204: { description: "Workflow deleted successfully" },
            404: { description: "Workflow not found" },
          },
        },
      },
      "/api/v1/workflows/{id}/run": {
        post: {
          summary: "Trigger Workflow Execution Run",
          description:
            "Executes workflow steps sequentially with Gemini. Returns 202 Accepted with run id.",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            {
              name: "sync",
              in: "query",
              required: false,
              schema: { type: "boolean", default: false },
              description: "When true, waits for execution to complete before responding",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    input: {
                      type: "object",
                      example: { text: "Customer: Alice. Charged twice for Order #123." },
                    },
                  },
                },
              },
            },
          },
          responses: {
            202: {
              description: "Execution run accepted",
              content: {
                "application/json": {
                  example: {
                    id: "47b931e9-4e7f-4f7d-8692-a169b50db1f4",
                    run_id: "47b931e9-4e7f-4f7d-8692-a169b50db1f4",
                    workflow_id: "c56a4180-65aa-42ec-a945-5fd21dec0538",
                    status: "pending",
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/runs/{id}": {
        get: {
          summary: "Get Run Status & Step Results",
          security: [{ ApiKeyAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: {
              content: { "application/json": { schema: { $ref: "#/components/schemas/Run" } } },
            },
            404: { description: "Run not found" },
          },
        },
      },
      "/api/v1/runs": {
        get: {
          summary: "List Runs",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            { name: "status", in: "query", schema: { type: "string", enum: ["pending", "running", "completed", "failed"] } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: {
            200: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Run" } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/webhooks": {
        get: {
          summary: "List Webhooks",
          security: [{ ApiKeyAuth: [] }],
          responses: {
            200: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Webhook" } },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: "Register Webhook",
          description:
            "Registers an HTTP/HTTPS endpoint for automated webhook dispatch. Returns webhook secret once.",
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["url", "events"],
                  properties: {
                    url: { type: "string", format: "uri", example: "https://my-app.com/api/webhook" },
                    events: {
                      type: "array",
                      items: {
                        type: "string",
                        enum: ["workflow.created", "run.started", "run.completed", "run.failed"],
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Webhook registered. Save the secret key.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Webhook" } } },
            },
          },
        },
      },
      "/api/v1/webhooks/{id}": {
        get: {
          summary: "Get Webhook Details & Delivery History",
          security: [{ ApiKeyAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Webhook details" }, 404: { description: "Not found" } },
        },
        delete: {
          summary: "Delete Webhook",
          security: [{ ApiKeyAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 204: { description: "Deleted" }, 404: { description: "Not found" } },
        },
      },
      "/api/v1/webhooks/{id}/test": {
        post: {
          summary: "Send Test Webhook Ping",
          description: "Sends a sample event to test delivery and signature verification.",
          security: [{ ApiKeyAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: {
              content: {
                "application/json": {
                  example: {
                    success: true,
                    event: "run.completed",
                    target_url: "https://example.com/webhook",
                    message: "Test event delivered successfully with 2xx response",
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/api-keys": {
        get: {
          summary: "List API Keys",
          security: [{ ApiKeyAuth: [] }],
          responses: { 200: { description: "List of keys" } },
        },
        post: {
          summary: "Generate API Key",
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: { name: { type: "string", example: "Production Worker" } },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Key created. Raw key shown once.",
              content: {
                "application/json": {
                  example: {
                    id: "3e596bb4-5a02-4d74-8b6b-ca3956fc0ea0",
                    name: "Production Worker",
                    key_prefix: "wfa_live_a83f91",
                    raw_key: "wfa_live_a83f91048b19f04cb2a78103ec910394",
                    is_active: true,
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/api-keys/{id}": {
        delete: {
          summary: "Revoke API Key",
          security: [{ ApiKeyAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 204: { description: "API key revoked" } },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec);
}
