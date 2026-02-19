import { prisma, type DbTx } from "@db";

import type { EmailToken, EmailTokenType } from "@prisma/client";

const db = (tx?: DbTx) => tx ?? prisma;

export class EmailTokensRepo {
  async create(
    params: {
      email: string;
      userId?: string | null;
      type: EmailTokenType;
      tokenHash: string;
      expiresAt: Date;
    },
    tx?: DbTx,
  ): Promise<EmailToken> {
    return db(tx).emailToken.create({
      data: {
        email: params.email.toLowerCase(),
        userId: params.userId ?? null,
        type: params.type,
        tokenHash: params.tokenHash,
        expiresAt: params.expiresAt,
      },
    });
  }

  async findValidByTokenHash(
    tokenHash: string,
    tx?: DbTx,
  ): Promise<EmailToken | null> {
    return db(tx).emailToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async markUsedIfUnused(id: string, tx?: DbTx): Promise<boolean> {
    const res = await db(tx).emailToken.updateMany({
      where: { id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    return res.count === 1;
  }

  async deleteExpired(tx?: DbTx): Promise<number> {
    const res = await db(tx).emailToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return res.count;
  }
}
