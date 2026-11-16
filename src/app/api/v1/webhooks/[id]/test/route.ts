import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/middleware-helper";
import { webhookRepo } from "@/lib/db";
import { createErrorResponse } from "@/lib/errors";
import { deliverWebhookWithRetries } from "@/lib/webhooks/dispatcher";

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
  const webhook = await webhookRepo.getById(id, auth.apiKey.id);

  if (!webhook) {
    return createErrorResponse(404, "NOT_FOUND", `Webhook with id '${id}' not found`);
  }

  const sampleEvent = webhook.events[0] || "run.completed";
  const samplePayload = {
    test: true,
    message: "This is an automated test ping from Workflow Automation Assistant",
    webhook_id: webhook.id,
    timestamp: new Date().toISOString(),
  };

  const deliverySuccess = await deliverWebhookWithRetries(webhook, sampleEvent, samplePayload, 1);

  return NextResponse.json({
    success: deliverySuccess,
    event: sampleEvent,
    target_url: webhook.url,
    message: deliverySuccess
      ? "Test event delivered successfully with 2xx response"
      : "Test delivery failed. Check target URL and delivery logs for details.",
  });
}
