import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

export type PepperConfig = {
  active: string;
  legacy?: string[];
};

export type PepperInput = string | PepperConfig;

function toUtf8Bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function assertValidPepper(pepper: string): void {
  if (!pepper || pepper.length < 32) {
    throw new Error("TOKEN_PEPPER must be set and long enough");
  }
}

export function normalizePepperConfig(input: PepperInput): PepperConfig {
  if (typeof input === "string") {
    assertValidPepper(input);
    return { active: input, legacy: [] };
  }
  assertValidPepper(input.active);
  const legacy = (input.legacy ?? []).filter(Boolean);
  legacy.forEach(assertValidPepper);
  return { active: input.active, legacy };
}

function uniquePeppers(input: PepperInput): string[] {
  const config = normalizePepperConfig(input);
  return Array.from(new Set([config.active, ...(config.legacy ?? [])]));
}

export function sha256Hex(input: string): string {
  return bytesToHex(sha256(toUtf8Bytes(input)));
}

export function hashToken(token: string, pepper: string): string {
  assertValidPepper(pepper);
  const digest = hmac(sha256, toUtf8Bytes(pepper), toUtf8Bytes(token));
  return bytesToHex(digest);
}

export function hashTokenCandidates(token: string, pepper: PepperInput): string[] {
  return uniquePeppers(pepper).map((value) => hashToken(token, value));
}

export function hashIdentifier(identifier: string, pepper: PepperInput): string {
  const activePepper = normalizePepperConfig(pepper).active;
  return hashToken(identifier, activePepper);
}
