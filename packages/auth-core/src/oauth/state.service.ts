import type { OAuthProvider } from "@contracts";
import { hashIdentifier, type PepperInput } from "../hashing/token";
import { randomTokenBase64Url } from "../hashing/random";
import { authErr } from "../errors";
import type { OAuthStatesRepo } from "../auth.ports";
import { findByTokenCandidates } from "../utils/token-candidates";
import { clampTtlMinutes } from "../utils/ttl";

function assertSafeRedirectPath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..") || path.includes("\\")) {
    throw authErr("unauthorized", "Invalid redirect path");
  }
  return path;
}

export class OAuthStateService {
  constructor(
    private readonly repo: OAuthStatesRepo,
    private readonly pepper: PepperInput,
  ) {}

  async create(params: {
    provider: OAuthProvider;
    redirectPath: string;
    ttlMinutes: number;
  }): Promise<{ state: string; codeVerifier: string }> {
    const state = randomTokenBase64Url(32);
    const codeVerifier = randomTokenBase64Url(48);

    const stateHash = hashIdentifier(state, this.pepper);
    const ttlMinutes = clampTtlMinutes(params.ttlMinutes, 1, 20);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const redirectPath = assertSafeRedirectPath(params.redirectPath);

    await this.repo.create({
      provider: params.provider,
      stateHash,
      codeVerifier,
      redirectPath,
      expiresAt,
    });

    return { state, codeVerifier };
  }

  async consume(params: {
    provider: OAuthProvider;
    state: string;
  }): Promise<{ codeVerifier: string; redirectPath: string } | null> {
    const row = await findByTokenCandidates(params.state, this.pepper, (stateHash) =>
      this.repo.findValidByStateHash(stateHash),
    );
    if (!row) return null;
    if (row.provider !== params.provider) return null;

    const deleted = await this.repo.deleteByIdIfExists(row.id);
    if (!deleted) return null;

    return { codeVerifier: row.codeVerifier, redirectPath: row.redirectPath };
  }
}
