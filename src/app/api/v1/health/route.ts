import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "1.0.0",
    service: "Workflow Automation Assistant",
    timestamp: new Date().toISOString(),
  });
}
