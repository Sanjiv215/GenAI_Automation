import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/middleware-helper";
import { webhookRepo, webhookDeliveryRepo } from "@/lib/db";
import { createErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(req);
  if (!auth.success) return auth.response;

  const { id } = params;
  const webhook = await webhookRepo.getById(id, auth.apiKey.id);

  if (!webhook) {
    return createErrorResponse(404, "NOT_FOUND", `Webhook with id '${id}' not found`);
  }

  const deliveries = await webhookDeliveryRepo.listByWebhook(id);

  return NextResponse.json({
    webhook: {
      ...webhook,
      secret: `${webhook.secret.slice(0, 10)}...`,
    },
    deliveries,
  });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(req);
  if (!auth.success) return auth.response;

  const { id } = params;
  const existing = await webhookRepo.getById(id, auth.apiKey.id);

  if (!existing) {
    return createErrorResponse(404, "NOT_FOUND", `Webhook with id '${id}' not found`);
  }

  const deleted = await webhookRepo.delete(id, auth.apiKey.id);
  if (!deleted) {
    return createErrorResponse(500, "DELETE_FAILED", "Failed to delete webhook");
  }

  return new NextResponse(null, { status: 204 });
}
