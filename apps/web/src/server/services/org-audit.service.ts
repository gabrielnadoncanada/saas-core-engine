import "server-only";

import { prisma } from "@db";
import {
  OrgAuditService,
  type OrgAuditAction,
  type OrgAuditFilters,
  type OrgAuditOutcome,
  type OrgAuditRepo,
} from "@org-core";

import type { Prisma } from "@prisma/client";

class PrismaOrgAuditRepo implements OrgAuditRepo {
  async createLog(params: {
    organizationId: string;
    actorUserId?: string | null;
    action: OrgAuditAction;
    targetType?: string;
    targetId?: string;
    target?: Record<string, unknown> | null;
    diff?: Record<string, unknown> | null;
    ip?: string | null;
    userAgent?: string | null;
    traceId?: string | null;
    outcome?: OrgAuditOutcome;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const target =
      (params.target ?? undefined) as Prisma.InputJsonValue | undefined;
    const diff = (params.diff ?? undefined) as Prisma.InputJsonValue | undefined;
    const metadata =
      (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined;

    await prisma.orgAuditLog.create({
      data: {
        organizationId: params.organizationId,
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        target,
        diff,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
        traceId: params.traceId ?? null,
        outcome: params.outcome ?? "success",
        metadata,
      },
    });
  }

  findMany(params: {
    organizationId: string;
    filters?: OrgAuditFilters;
    page: number;
    pageSize: number;
    sortDir: "asc" | "desc";
  }) {
    const filters = params.filters ?? {};

    const where = {
      organizationId: params.organizationId,
      action: filters.action,
      actorUserId: filters.actorUserId,
      outcome: filters.outcome,
      targetType: filters.targetType,
      targetId: filters.targetId,
      createdAt:
        filters.from || filters.to
          ? {
              gte: filters.from,
              lte: filters.to,
            }
          : undefined,
    };

    return prisma.orgAuditLog.findMany({
      where,
      orderBy: { createdAt: params.sortDir },
      take: params.pageSize,
      skip: (params.page - 1) * params.pageSize,
    });
  }

  count(params: { organizationId: string; filters?: OrgAuditFilters }) {
    const filters = params.filters ?? {};
    const where = {
      organizationId: params.organizationId,
      action: filters.action,
      actorUserId: filters.actorUserId,
      outcome: filters.outcome,
      targetType: filters.targetType,
      targetId: filters.targetId,
      createdAt:
        filters.from || filters.to
          ? {
              gte: filters.from,
              lte: filters.to,
            }
          : undefined,
    };

    return prisma.orgAuditLog.count({ where });
  }
}

const service = new OrgAuditService(new PrismaOrgAuditRepo());

export type { OrgAuditAction, OrgAuditOutcome, OrgAuditFilters };

export async function logOrgAudit(params: {
  organizationId: string;
  actorUserId?: string | null;
  action: OrgAuditAction;
  targetType?: string;
  targetId?: string;
  target?: Record<string, unknown> | null;
  diff?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  traceId?: string | null;
  outcome?: OrgAuditOutcome;
  metadata?: Record<string, unknown>;
}) {
  await service.log(params);
}

export function queryOrgAudit(params: {
  organizationId: string;
  filters?: OrgAuditFilters;
  page?: number;
  pageSize?: number;
  sortDir?: "asc" | "desc";
}) {
  return service.query(params);
}
