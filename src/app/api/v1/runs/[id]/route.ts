import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/middleware-helper";
import { runRepo } from "@/lib/db";
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
  const run = await runRepo.getById(id, auth.apiKey.id);

  if (!run) {
    return createErrorResponse(404, "NOT_FOUND", `Run with id '${id}' not found`);
  }

  return NextResponse.json(run, { status: 200 });
}
