import { prisma, type DbTx } from "@db";

import type { Prisma } from "@db";

const db = (tx?: DbTx) =>
  (tx ?? prisma) as typeof prisma & {
    auditLog: {
      create: (args: unknown) => Promise<unknown>;
    };
  };

export class AuditLogsRepo {
  async create(
    params: {
      actorUserId?: string | null;
      organizationId?: string | null;
      action: string;
      targetType?: string | null;
      targetId?: string | null;
      result: "success" | "failure";
      ip?: string | null;
      userAgent?: string | null;
      traceId?: string | null;
      metadata?: Record<string, unknown> | null;
    },
    tx?: DbTx,
  ): Promise<void> {
    await db(tx).auditLog.create({
      data: {
        actorUserId: params.actorUserId ?? null,
        organizationId: params.organizationId ?? null,
        action: params.action,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        result: params.result,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
        traceId: params.traceId ?? null,
        metadata: (params.metadata ?? null) as Prisma.InputJsonValue,
      },
    });
  }
}
