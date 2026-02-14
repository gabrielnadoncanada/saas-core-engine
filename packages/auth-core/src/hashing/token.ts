import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

function toUtf8Bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export function sha256Hex(input: string): string {
  return bytesToHex(sha256(toUtf8Bytes(input)));
}

export function hashToken(token: string, pepper: string): string {
  if (!pepper || pepper.length < 16)
    throw new Error("TOKEN_PEPPER must be set and long enough");
  return sha256Hex(`${token}:${pepper}`);
}
