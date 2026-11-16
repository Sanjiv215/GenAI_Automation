import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/auth/keys";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { verifyAdminSessionToken, ADMIN_COOKIE_NAME, getAdminApiKey } from "@/lib/auth/admin";
import { createErrorResponse } from "@/lib/errors";
import { ApiKey } from "@/types";

export type AuthResult =
  | { success: true; apiKey: ApiKey }
  | { success: false; response: NextResponse };

export async function authenticateApiRequest(req: Request | NextRequest): Promise<AuthResult> {
  const rawKey = req.headers.get("x-api-key");

  // Check API key first
  if (rawKey) {
    const keyVerification = await verifyApiKey(rawKey);
    if (!keyVerification.success) {
      return {
        success: false,
        response: createErrorResponse(
          keyVerification.status,
          keyVerification.code,
          keyVerification.message
        ),
      };
    }

    // Rate limiting check per API key
    const rateCheck = checkRateLimit(keyVerification.apiKey.id);
    if (!rateCheck.allowed) {
      return {
        success: false,
        response: createErrorResponse(
          429,
          "RATE_LIMIT_EXCEEDED",
          `Rate limit of ${rateCheck.limit} requests/minute exceeded. Try again in ${rateCheck.retryAfterSeconds} seconds.`,
          undefined,
          { "Retry-After": rateCheck.retryAfterSeconds.toString() }
        ),
      };
    }

    return { success: true, apiKey: keyVerification.apiKey };
  }

  // Check if admin session cookie exists (for internal UI requests)
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const cookiesList = cookieHeader.split(";").map((c) => c.trim());
    const sessionCookie = cookiesList.find((c) => c.startsWith(`${ADMIN_COOKIE_NAME}=`));
    if (sessionCookie) {
      const token = sessionCookie.split("=")[1];
      if (verifyAdminSessionToken(token)) {
        const adminKey = await getAdminApiKey();
        return { success: true, apiKey: adminKey };
      }
    }
  }

  // Missing authentication
  return {
    success: false,
    response: createErrorResponse(
      401,
      "UNAUTHORIZED",
      "Authentication required. Provide a valid 'x-api-key' header."
    ),
  };
}
