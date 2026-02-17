import argon2 from "argon2";

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 1024;
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19MB
  timeCost: 2,
  parallelism: 1,
} as const;

let dummyPasswordHashPromise: Promise<string> | null = null;

export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < PASSWORD_MIN_LENGTH) throw new Error("Password too short");
  const byteLength = new TextEncoder().encode(plain).length;
  if (byteLength > PASSWORD_MAX_BYTES) throw new Error("Password too long");

  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

export function passwordNeedsRehash(hash: string): boolean {
  try {
    return argon2.needsRehash(hash, ARGON2_OPTIONS);
  } catch {
    return false;
  }
}

export function getDummyPasswordHash(): Promise<string> {
  if (!dummyPasswordHashPromise) {
    dummyPasswordHashPromise = argon2.hash("dummy-password-for-timing-only", ARGON2_OPTIONS);
  }
  return dummyPasswordHashPromise;
}
