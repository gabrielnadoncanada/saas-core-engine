import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

function base64urlFromBytes(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export function codeChallengeS256(codeVerifier: string): string {
  const bytes = new TextEncoder().encode(codeVerifier);
  const digest = sha256(bytes);
  return base64urlFromBytes(digest);
}

// For debugging only; not used by default
export function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  return bytesToHex(sha256(bytes));
}
