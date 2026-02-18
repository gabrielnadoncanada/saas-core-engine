import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

export type PepperInput = string;

function toUtf8Bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function assertValidPepper(pepper: string): void {
  if (!pepper || pepper.length < 32) {
    throw new Error("TOKEN_PEPPER must be set and long enough");
  }
}

export function sha256Hex(input: string): string {
  return bytesToHex(sha256(toUtf8Bytes(input)));
}

export function hashToken(token: string, pepper: string): string {
  assertValidPepper(pepper);
  const digest = hmac(sha256, toUtf8Bytes(pepper), toUtf8Bytes(token));
  return bytesToHex(digest);
}

export function hashIdentifier(identifier: string, pepper: PepperInput): string {
  return hashToken(identifier, pepper);
}
