import crypto from "crypto";

export function isAllowedWebhookUrl(urlStr: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(urlStr);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, reason: "Only HTTP and HTTPS protocols are allowed" };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block private IPs and cloud metadata addresses in deployed production (SSRF prevention)
    const isDeployedProduction =
      process.env.VERCEL_ENV === "production" ||
      (process.env.NODE_ENV === "production" &&
        process.env.ALLOW_LOCAL_WEBHOOKS !== "true" &&
        Boolean(process.env.APP_URL && !process.env.APP_URL.includes("localhost")));

    if (isDeployedProduction) {
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1" ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal")
      ) {
        return { valid: false, reason: "Localhost addresses are forbidden in production" };
      }

      // Check for IPv4 private ranges (10.x, 192.168.x, 172.16-31.x, 169.254.x)
      const ipParts = hostname.split(".").map(Number);
      if (ipParts.length === 4 && ipParts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
        if (
          ipParts[0] === 10 ||
          ipParts[0] === 127 ||
          (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31) ||
          (ipParts[0] === 192 && ipParts[1] === 168) ||
          (ipParts[0] === 169 && ipParts[1] === 254) // AWS/GCP metadata
        ) {
          return { valid: false, reason: "Private and cloud metadata IP ranges are forbidden in production" };
        }
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "Invalid URL format" };
  }
}

export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("hex")}`;
}

export function computeWebhookSignature(secret: string, rawBody: string): string {
  const hash = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return `sha256=${hash}`;
}

export function verifyWebhookSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const expectedSignature = computeWebhookSignature(secret, rawBody);
  const signatureBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}
