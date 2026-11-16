import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/middleware-helper";
import { runRepo } from "@/lib/db";
import { createErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status") || undefined;
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  const limit = Math.min(Math.max(parseInt(limitParam || "20", 10) || 20, 1), 100);
  const offset = Math.max(parseInt(offsetParam || "0", 10) || 0, 0);

  try {
    const { data, total } = await runRepo.list(auth.apiKey.id, statusParam, limit, offset);
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
