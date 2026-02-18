import { hashTokenCandidates, type PepperInput } from "../hashing/token";

export async function findByTokenCandidates<T>(
  rawToken: string,
  pepper: PepperInput,
  finder: (hash: string) => Promise<T | null>,
): Promise<T | null> {
  for (const hash of hashTokenCandidates(rawToken, pepper)) {
    const found = await finder(hash);
    if (found) return found;
  }
  return null;
}
