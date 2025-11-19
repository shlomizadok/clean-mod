import crypto from "crypto";

const HASH_ALGO = "sha256";

/**
 * Generate a new API key in the format: cm_live_<randomString>
 */
export function generateApiKey(): string {
  // Generate 32 random bytes and encode as base64url (URL-safe)
  const randomBytes = crypto.randomBytes(32);
  const randomString = randomBytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `cm_live_${randomString}`;
}

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash(HASH_ALGO).update(rawKey).digest("hex");
}
