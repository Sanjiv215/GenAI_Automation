import { NextRequest, NextResponse } from "next/server";
import { adminLoginSchema } from "@/lib/validations";
import { createAdminSessionToken, ADMIN_COOKIE_NAME } from "@/lib/auth/admin";
import { createErrorResponse, handleZodError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse(400, "VALIDATION_ERROR", "Invalid JSON request body");
  }

  const parseResult = adminLoginSchema.safeParse(body);
  if (!parseResult.success) {
    return handleZodError(parseResult.error);
  }

  const { password } = parseResult.data;
  const configuredPassword = process.env.ADMIN_PASSWORD || "admin123";

  if (password !== configuredPassword) {
    return createErrorResponse(401, "UNAUTHORIZED", "Invalid admin password");
  }

  const token = createAdminSessionToken();
  const response = NextResponse.json({ success: true, message: "Logged in successfully" });

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
}
