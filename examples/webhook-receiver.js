/**
 * Webhook Receiver Example
 * Demonstrates how external applications receive webhook events and verify HMAC-SHA256 signatures.
 * 
 * Usage:
 *   WEBHOOK_SECRET=your_webhook_secret_here PORT=4000 node examples/webhook-receiver.js
 */

const http = require("http");
const crypto = require("crypto");

const PORT = process.env.PORT || 4000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "whsec_demo_secret";

function verifySignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const expectedSignature =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const sigBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && (req.url === "/webhook" || req.url === "/")) {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      const signature = req.headers["x-webhook-signature"];
      const event = req.headers["x-webhook-event"];

      console.log("\n==================================================");
      console.log(`[${new Date().toISOString()}] Received Webhook Event: ${event}`);
      console.log(`Signature Header: ${signature}`);

      const isValid = verifySignature(body, signature, WEBHOOK_SECRET);
      console.log(`HMAC Verification Result: ${isValid ? "VALID (Verified Authenticity)" : "INVALID (Signature Mismatch)"}`);

      try {
        const parsed = JSON.parse(body);
        console.log("Payload Data:", JSON.stringify(parsed, null, 2));
      } catch {
        console.log("Raw Body:", body);
      }
      console.log("==================================================\n");

      if (!isValid && process.env.ENFORCE_VERIFICATION === "true") {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid signature" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "received", event, verified: isValid }));
    });
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", message: "Send POST to /webhook" }));
  }
});

server.listen(PORT, () => {
  console.log(`Webhook Receiver listening on http://localhost:${PORT}/webhook`);
  console.log(`Configured Secret: ${WEBHOOK_SECRET}`);
});
