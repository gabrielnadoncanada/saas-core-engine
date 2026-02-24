import { prisma, type DbTx } from "@db";

import type { OAuthAccount, OAuthProvider } from "@db";

const db = (tx?: DbTx) => tx ?? prisma;

export class OAuthAccountsRepo {
  async findByProviderAccount(
    params: { provider: OAuthProvider; providerAccountId: string },
    tx?: DbTx,
  ): Promise<OAuthAccount | null> {
    return db(tx).oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: params.provider,
          providerAccountId: params.providerAccountId,
        },
      },
    });
  }

  async create(
    params: {
      userId: string;
      provider: OAuthProvider;
      providerAccountId: string;
      email?: string | null;
    },
    tx?: DbTx,
  ): Promise<OAuthAccount> {
    return db(tx).oAuthAccount.create({
      data: {
        userId: params.userId,
        provider: params.provider,
        providerAccountId: params.providerAccountId,
        email: params.email ?? null,
      },
    });
  }

  async listByUser(userId: string, tx?: DbTx): Promise<OAuthAccount[]> {
    return db(tx).oAuthAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  }

  async findByUserAndProvider(
    params: { userId: string; provider: OAuthProvider },
    tx?: DbTx,
  ): Promise<OAuthAccount | null> {
    return db(tx).oAuthAccount.findFirst({
      where: {
        userId: params.userId,
        provider: params.provider,
      },
    });
  }

  async deleteByUserAndProvider(
    params: { userId: string; provider: OAuthProvider },
    tx?: DbTx,
  ): Promise<number> {
    const res = await db(tx).oAuthAccount.deleteMany({
      where: {
        userId: params.userId,
        provider: params.provider,
      },
    });
    return res.count;
  }

  async touchLastUsed(
    params: { provider: OAuthProvider; providerAccountId: string; at?: Date },
    tx?: DbTx,
  ): Promise<void> {
    await db(tx).oAuthAccount.updateMany({
      where: {
        provider: params.provider,
        providerAccountId: params.providerAccountId,
      },
      data: {
        lastUsedAt: params.at ?? new Date(),
      },
    });
  }
}
