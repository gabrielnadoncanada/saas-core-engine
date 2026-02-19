import "server-only";

import { prisma } from "@db";

import type { Prisma } from "@prisma/client";

export type OrgAuditAction =
  | "org.created"
  | "org.switched"
  | "org.invite.created"
  | "org.invite.accepted"
  | "org.member.role_changed"
  | "org.member.removed"
  | "org.member.ownership_transferred"
  | "org.roles.updated"
  | "org.impersonation.started"
  | "org.impersonation.stopped";

export type OrgAuditOutcome = "success" | "forbidden" | "error";

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
  const target = (params.target ?? undefined) as Prisma.InputJsonValue | undefined;
  const diff = (params.diff ?? undefined) as Prisma.InputJsonValue | undefined;
  const metadata = (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined;

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

export type OrgAuditFilters = {
  action?: string;
  actorUserId?: string;
  outcome?: OrgAuditOutcome;
  targetType?: string;
  targetId?: string;
  from?: Date;
  to?: Date;
};

export async function queryOrgAudit(params: {
  organizationId: string;
  filters?: OrgAuditFilters;
  page?: number;
  pageSize?: number;
  sortDir?: "asc" | "desc";
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 25));
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

  const [rows, total] = await Promise.all([
    prisma.orgAuditLog.findMany({
      where,
      orderBy: { createdAt: params.sortDir ?? "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.orgAuditLog.count({ where }),
  ]);

  return {
    rows,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
