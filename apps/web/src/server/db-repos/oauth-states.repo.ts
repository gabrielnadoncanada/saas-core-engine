import type { OAuthProvider, OAuthState } from "@prisma/client";
import { prisma, type DbTx } from "@db";

const db = (tx?: DbTx) => tx ?? prisma;

export class OAuthStatesRepo {
  async create(
    params: {
      provider: OAuthProvider;
      stateHash: string;
      codeVerifier: string;
      redirectUri: string;
      expiresAt: Date;
    },
    tx?: DbTx,
  ): Promise<OAuthState> {
    return db(tx).oAuthState.create({ data: params });
  }

  async findValidByStateHash(
    stateHash: string,
    tx?: DbTx,
  ): Promise<OAuthState | null> {
    return db(tx).oAuthState.findFirst({
      where: { stateHash, expiresAt: { gt: new Date() } },
    });
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
