import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/middleware-helper";
import { webhookRepo } from "@/lib/db";
import { createWebhookInputSchema } from "@/lib/validations";
import { createErrorResponse, handleZodError } from "@/lib/errors";
import { generateWebhookSecret, isAllowedWebhookUrl } from "@/lib/webhooks/security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.success) return auth.response;

  try {
    const webhooks = await webhookRepo.list(auth.apiKey.id);
    // Mask secrets on list view
    const masked = webhooks.map((w) => ({
      ...w,
      secret: `${w.secret.slice(0, 10)}...`,
    }));
    return NextResponse.json({ data: masked });
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

  const parseResult = createWebhookInputSchema.safeParse(body);
  if (!parseResult.success) {
    return handleZodError(parseResult.error);
  }

  const { url, events } = parseResult.data;

  // Validate URL protocol and SSRF constraints
  const urlCheck = isAllowedWebhookUrl(url);
  if (!urlCheck.valid) {
    return createErrorResponse(400, "INVALID_URL", urlCheck.reason || "Invalid webhook destination URL");
  }

  try {
    const secret = generateWebhookSecret();
    const newWebhook = await webhookRepo.create({
      api_key_id: auth.apiKey.id,
      url,
      events,
      secret,
      is_active: true,
    });

    // Return the newly created webhook including the raw secret ONCE
    return NextResponse.json(newWebhook, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return createErrorResponse(500, "DATABASE_ERROR", message);
  }
}
