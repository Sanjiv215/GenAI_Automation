import { NextRequest } from "next/server";
import { POST as v1Post } from "@/app/api/v1/webhooks/[id]/test/route";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  return v1Post(req, ctx);
}
