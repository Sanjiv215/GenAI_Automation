import crypto from "crypto";
import { webhookRepo, webhookDeliveryRepo } from "@/lib/db";
import { computeWebhookSignature, isAllowedWebhookUrl } from "@/lib/webhooks/security";
import { Webhook, WebhookEvent } from "@/types";

export interface WebhookEventPayload {
  id: string;
  event: WebhookEvent | string;
  created_at: string;
  data: Record<string, unknown>;
}

export async function deliverWebhookWithRetries(
  webhook: Webhook,
  event: string,
  eventData: Record<string, unknown>,
  maxAttempts = 3
): Promise<boolean> {
  const urlCheck = isAllowedWebhookUrl(webhook.url);
  if (!urlCheck.valid) {
    await webhookDeliveryRepo.create({
      webhook_id: webhook.id,
      event,
      payload: { error: urlCheck.reason, target_url: webhook.url },
      response_status: 400,
      attempt: 1,
      success: false,
    });
    return false;
  }

  const payload: WebhookEventPayload = {
    id: crypto.randomUUID(),
    event,
    created_at: new Date().toISOString(),
    data: eventData,
  };

  const rawBody = JSON.stringify(payload);
  const signature = computeWebhookSignature(webhook.secret, rawBody);

  let success = false;
  let delay = 500;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let responseStatus: number | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event": event,
          "X-Webhook-Signature": signature,
          "User-Agent": "Workflow-Automation-Assistant-Webhook/1.0",
        },
        body: rawBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      responseStatus = response.status;
      success = response.ok; // 2xx is considered success
    } catch {
      responseStatus = null;
      success = false;
    }

    // Log the delivery attempt in database
    await webhookDeliveryRepo.create({
      webhook_id: webhook.id,
      event,
      payload: payload as unknown as Record<string, unknown>,
      response_status: responseStatus,
      attempt,
      success,
    });

    if (success) {
      return true;
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }

  return false;
}

export async function dispatchWebhookEvent(
  event: WebhookEvent,
  eventData: Record<string, unknown>,
  apiKeyId: string
): Promise<void> {
  try {
    const webhooks = await webhookRepo.findByEvent(event, apiKeyId);
    if (!webhooks || webhooks.length === 0) return;

    // Trigger deliveries asynchronously
    await Promise.allSettled(
      webhooks.map((wh) => deliverWebhookWithRetries(wh, event, eventData))
    );
  } catch {
    // Webhook dispatch should not crash the main thread
  }
}
