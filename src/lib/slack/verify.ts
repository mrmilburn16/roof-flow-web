import crypto from "crypto";

/**
 * Verify that a request came from Slack using the signing secret.
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackRequest(
  body: string,
  signature: string | null,
  signingSecret: string
): boolean {
  if (!signature || !signingSecret) return false;
  const [version, hash] = signature.split("=");
  if (version !== "v0" || !hash) return false;
  const base = `v0:${body}`;
  const expected = crypto
    .createHmac("sha256", signingSecret)
    .update(base)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expected, "hex"));
}
