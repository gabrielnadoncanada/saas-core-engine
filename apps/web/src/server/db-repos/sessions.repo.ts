import { prisma, type DbTx } from "@db";

import type { Session } from "@db";

const db = (tx?: DbTx) => tx ?? prisma;

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
    return db(tx).session.create({
      data: {
        userId: params.userId,
        tokenHash: params.tokenHash,
        expiresAt: params.expiresAt,
        lastSeenAt: new Date(),
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  }

  async findActiveByTokenHash(
    tokenHash: string,
    tx?: DbTx,
  ): Promise<Session | null> {
    return db(tx).session.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async listActiveByUser(userId: string, tx?: DbTx): Promise<Session[]> {
    return db(tx).session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
  }

  async touchLastSeen(sessionId: string, tx?: DbTx): Promise<void> {
    await db(tx).session.update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date() },
    });
  }

  async revokeSession(sessionId: string, tx?: DbTx): Promise<void> {
    await db(tx).session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string, tx?: DbTx): Promise<void> {
    await db(tx).session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
