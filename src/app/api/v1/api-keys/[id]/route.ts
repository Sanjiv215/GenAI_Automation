import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/middleware-helper";
import { apiKeyRepo } from "@/lib/db";
import { createErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(req);
  if (!auth.success) return auth.response;

  const { id } = params;
  const existing = await apiKeyRepo.getById(id);

  if (!existing) {
    return createErrorResponse(404, "NOT_FOUND", `API key with id '${id}' not found`);
  }

  const revoked = await apiKeyRepo.revoke(id);
  if (!revoked) {
    return createErrorResponse(500, "REVOKE_FAILED", "Failed to revoke API key");
  }

  return new NextResponse(null, { status: 204 });
}
