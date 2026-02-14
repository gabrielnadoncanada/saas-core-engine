import type { OAuthProvider } from "@prisma/client";
import { OAuthStatesRepo } from "@db";
import { hashToken } from "../hashing/token";
import { randomTokenBase64Url } from "../hashing/random";

export class OAuthStateService {
  constructor(private readonly repo = new OAuthStatesRepo()) {}

  async create(params: {
    provider: OAuthProvider;
    redirectUri: string; // relative path like /dashboard
    ttlMinutes: number;
    pepper: string;
  }): Promise<{ state: string; codeVerifier: string }> {
    const state = randomTokenBase64Url(32);
    const codeVerifier = randomTokenBase64Url(48);

    const stateHash = hashToken(state, params.pepper);
    const expiresAt = new Date(Date.now() + params.ttlMinutes * 60 * 1000);

    await this.repo.create({
      provider: params.provider,
      stateHash,
      codeVerifier,
      redirectUri: params.redirectUri,
      expiresAt,
    });

    return { state, codeVerifier };
  }

  async consume(params: {
    provider: OAuthProvider;
    state: string;
    pepper: string;
  }): Promise<{ codeVerifier: string; redirectUri: string } | null> {
    const stateHash = hashToken(params.state, params.pepper);
    const row = await this.repo.findValidByStateHash(stateHash);
    if (!row) return null;
    if (row.provider !== params.provider) return null;

    await this.repo.deleteById(row.id);

    return { codeVerifier: row.codeVerifier, redirectUri: row.redirectUri };
  }
}
