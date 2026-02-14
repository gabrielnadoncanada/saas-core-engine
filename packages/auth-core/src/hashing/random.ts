import { randomBytes } from "@noble/hashes/utils";

export function randomTokenBase64Url(byteLength = 32): string {
  const bytes = randomBytes(byteLength);
  // base64url encode without Buffer (works in node via btoa? not reliable)
  // We'll use Buffer since auth-core runs server-side Node.
  return Buffer.from(bytes).toString("base64url");
}
