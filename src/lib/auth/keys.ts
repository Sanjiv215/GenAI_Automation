import crypto from "crypto";
import { apiKeyRepo } from "@/lib/db";
import { ApiKey } from "@/types";

export interface GeneratedKeyResult {
  apiKey: ApiKey;
  rawKey: string;
}

export async function createNewApiKey(name: string): Promise<GeneratedKeyResult> {
  // Generate 16 bytes = 32 hex chars
  const randomHex = crypto.randomBytes(16).toString("hex");
  const rawKey = `wfa_live_${randomHex}`;
  const keyPrefix = `wfa_live_${randomHex.slice(0, 6)}`;
  const keyHash = hashKey(rawKey);

  const apiKey = await apiKeyRepo.create({
    name,
    key_prefix: keyPrefix,
    key_hash: keyHash,
  });

  return { apiKey, rawKey };
}

export function hashKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export async function verifyApiKey(rawKey: string | null): Promise<
  | { success: true; apiKey: ApiKey }
  | { success: false; status: 401 | 403; code: string; message: string }
> {
  if (!rawKey || rawKey.trim() === "") {
    return {
      success: false,
      status: 401,
      code: "UNAUTHORIZED",
      message: "Missing x-api-key header in request",
    };
  }

  const hash = hashKey(rawKey.trim());
  const keyRecord = await apiKeyRepo.findByHash(hash);

  if (!keyRecord) {
    return {
      success: false,
      status: 403,
      code: "FORBIDDEN",
      message: "API key is invalid or unrecognized",
    };
  }

  if (!keyRecord.is_active) {
    return {
      success: false,
      status: 403,
      code: "FORBIDDEN",
      message: "API key has been revoked and is no longer active",
    };
  }

  // Update last used timestamp in the background
  apiKeyRepo.updateLastUsed(keyRecord.id).catch(() => {});

  return { success: true, apiKey: keyRecord };
}
