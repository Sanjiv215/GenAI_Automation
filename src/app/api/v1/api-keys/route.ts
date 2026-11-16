import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/middleware-helper";
import { apiKeyRepo } from "@/lib/db";
import { createApiKeyInputSchema } from "@/lib/validations";
import { createErrorResponse, handleZodError } from "@/lib/errors";
import { createNewApiKey } from "@/lib/auth/keys";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.success) return auth.response;

  try {
    const keys = await apiKeyRepo.list();
    return NextResponse.json({ data: keys });
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

  const parseResult = createApiKeyInputSchema.safeParse(body);
  if (!parseResult.success) {
    return handleZodError(parseResult.error);
  }

  try {
    const { apiKey, rawKey } = await createNewApiKey(parseResult.data.name);

    return NextResponse.json(
      {
        id: apiKey.id,
        name: apiKey.name,
        key_prefix: apiKey.key_prefix,
        raw_key: rawKey,
        is_active: apiKey.is_active,
        created_at: apiKey.created_at,
        warning: "Copy this key now. You will not be able to see the full raw key again.",
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return createErrorResponse(500, "DATABASE_ERROR", message);
  }
}
