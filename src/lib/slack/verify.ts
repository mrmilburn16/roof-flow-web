import crypto from "crypto";

/**
 * Verify that a request came from Slack using the signing secret.
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackRequest(
  body: string,
  signature: string | null,
  timestamp: string | null,
  signingSecret: string
): boolean {
  if (!signature || !timestamp || !signingSecret) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  // Reject old requests (replay protection). Slack timestamps are in seconds.
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 60 * 5) return false;
  const [version, hash] = signature.split("=");
  if (version !== "v0" || !hash) return false;
  const base = `v0:${timestamp}:${body}`;
  const expected = crypto
    .createHmac("sha256", signingSecret)
    .update(base)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expected, "hex"));
}
