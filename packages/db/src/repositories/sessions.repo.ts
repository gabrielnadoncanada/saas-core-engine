import type { Session } from "@prisma/client";
import { getDb, type DbTx } from "../tx";

export class SessionsRepo {
  async create(
    params: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
      ip?: string | null;
      userAgent?: string | null;
    },
    tx?: DbTx,
  ): Promise<Session> {
    return getDb(tx).session.create({
      data: {
        userId: params.userId,
        tokenHash: params.tokenHash,
        expiresAt: params.expiresAt,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  }

  async findActiveByTokenHash(
    tokenHash: string,
    tx?: DbTx,
  ): Promise<Session | null> {
    return getDb(tx).session.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async listActiveByUser(userId: string, tx?: DbTx): Promise<Session[]> {
    return getDb(tx).session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
  }

  async revokeSession(sessionId: string, tx?: DbTx): Promise<void> {
    await getDb(tx).session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string, tx?: DbTx): Promise<void> {
    await getDb(tx).session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
