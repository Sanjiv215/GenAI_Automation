import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/middleware-helper";
import { workflowRepo } from "@/lib/db";
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
  const workflow = await workflowRepo.getById(id, auth.apiKey.id);

  if (!workflow) {
    return createErrorResponse(404, "NOT_FOUND", `Workflow with id '${id}' not found`);
  }

  return NextResponse.json(workflow, { status: 200 });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(req);
  if (!auth.success) return auth.response;

  const { id } = params;
  const existing = await workflowRepo.getById(id, auth.apiKey.id);

  if (!existing) {
    return createErrorResponse(404, "NOT_FOUND", `Workflow with id '${id}' not found`);
  }

  const success = await workflowRepo.delete(id, auth.apiKey.id);
  if (!success) {
    return createErrorResponse(500, "DELETE_FAILED", "Failed to delete workflow");
  }

  return new NextResponse(null, { status: 204 });
}
