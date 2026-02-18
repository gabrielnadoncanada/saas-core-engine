import { hashIdentifier, type PepperInput } from "../hashing/token";

export async function findByTokenCandidates<T>(
  rawToken: string,
  pepper: PepperInput,
  finder: (hash: string) => Promise<T | null>,
): Promise<T | null> {
  return finder(hashIdentifier(rawToken, pepper));
}
