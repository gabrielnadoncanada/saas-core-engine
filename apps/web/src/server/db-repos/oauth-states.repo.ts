import type { OAuthStateRecord } from "@auth-core";
import type { OAuthProvider } from "@prisma/client";
import { prisma, type DbTx } from "@db";

const db = (tx?: DbTx) => tx ?? prisma;

export class OAuthStatesRepo {
  async create(
    params: {
      provider: OAuthProvider;
      stateHash: string;
      codeVerifier: string;
      redirectPath: string;
      expiresAt: Date;
    },
    tx?: DbTx,
  ): Promise<{ id: string }> {
    return db(tx).oAuthState.create({
      data: {
        provider: params.provider,
        stateHash: params.stateHash,
        codeVerifier: params.codeVerifier,
        redirectUri: params.redirectPath,
        expiresAt: params.expiresAt,
      },
      select: { id: true },
    });
  }

  async findValidByStateHash(
    stateHash: string,
    tx?: DbTx,
  ): Promise<OAuthStateRecord | null> {
    const row = await db(tx).oAuthState.findFirst({
      where: { stateHash, expiresAt: { gt: new Date() } },
    });
    if (!row) return null;
    return {
      id: row.id,
      provider: row.provider,
      codeVerifier: row.codeVerifier,
      redirectPath: row.redirectUri,
    };
  }

  async deleteByIdIfExists(id: string, tx?: DbTx): Promise<boolean> {
    const res = await db(tx).oAuthState.deleteMany({ where: { id } });
    return res.count === 1;
  }

  async deleteExpired(tx?: DbTx): Promise<number> {
    const res = await db(tx).oAuthState.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return res.count;
  }
}
