import argon2 from "argon2";

export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < 8) throw new Error("Password too short");
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 19456, // ~19MB
    timeCost: 2,
    parallelism: 1,
  });
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
