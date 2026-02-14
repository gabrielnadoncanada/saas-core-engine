import type { OAuthProvider, OAuthState } from "@prisma/client";
import { getDb, type DbTx } from "../tx";

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
    return getDb(tx).oAuthState.create({ data: params });
  }

  async findValidByStateHash(
    stateHash: string,
    tx?: DbTx,
  ): Promise<OAuthState | null> {
    return getDb(tx).oAuthState.findFirst({
      where: { stateHash, expiresAt: { gt: new Date() } },
    });
  }

  async deleteById(id: string, tx?: DbTx): Promise<void> {
    await getDb(tx).oAuthState.delete({ where: { id } });
  }

  async deleteExpired(tx?: DbTx): Promise<number> {
    const res = await getDb(tx).oAuthState.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return res.count;
  }
}
