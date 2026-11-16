import crypto from "crypto";
import { cookies } from "next/headers";
import { apiKeyRepo } from "@/lib/db";
import { ApiKey } from "@/types";

const ADMIN_COOKIE_NAME = "wfa_admin_session";
const SESSION_SECRET = process.env.ADMIN_PASSWORD || "dev_admin_secret_key_change_in_prod";

export function createAdminSessionToken(): string {
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(`admin:${timestamp}`)
    .digest("hex");
  return `${timestamp}.${signature}`;
}

export function verifyAdminSessionToken(token: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [timestamp, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(`admin:${timestamp}`)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return false;
  }

  // Token valid for 7 days
  const tokenAgeMs = Date.now() - parseInt(timestamp, 10);
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  return tokenAgeMs < maxAgeMs;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyAdminSessionToken(token);
}

// Get or ensure a default API key for admin session actions
export async function getAdminApiKey(): Promise<ApiKey> {
  const keys = await apiKeyRepo.list();
  const activeKey = keys.find((k) => k.is_active);
  if (activeKey) {
    const full = await apiKeyRepo.getById(activeKey.id);
    if (full) return full;
  }

  // Fallback to default
  const defaultHash = crypto
    .createHash("sha256")
    .update("wfa_live_00000000000000000000000000000000")
    .digest("hex");
  const existing = await apiKeyRepo.findByHash(defaultHash);
  if (existing) return existing;

  return apiKeyRepo.create({
    name: "Admin System Key",
    key_prefix: "wfa_live_000000",
    key_hash: defaultHash,
  });
}

export { ADMIN_COOKIE_NAME };
