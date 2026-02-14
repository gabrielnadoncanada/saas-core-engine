import type { EmailToken, EmailTokenType } from "@prisma/client";
import { getDb, type DbTx } from "../tx";

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
    return getDb(tx).emailToken.create({
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
    return getDb(tx).emailToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async markUsed(id: string, tx?: DbTx): Promise<void> {
    await getDb(tx).emailToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteExpired(tx?: DbTx): Promise<number> {
    const res = await getDb(tx).emailToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return res.count;
  }
}
