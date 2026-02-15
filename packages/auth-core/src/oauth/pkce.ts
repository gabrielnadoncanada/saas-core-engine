import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

function base64urlFromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function codeChallengeS256(codeVerifier: string): string {
  const bytes = new TextEncoder().encode(codeVerifier);
  const digest = sha256(bytes);
  return base64urlFromBytes(digest);
}

export function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  return bytesToHex(sha256(bytes));
}