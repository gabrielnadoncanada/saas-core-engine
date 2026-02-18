import "server-only";

import { prisma } from "@db";
const db = prisma as typeof prisma & {
  orgAuditLog: {
    create: (args: unknown) => Promise<unknown>;
  };
};

export type OrgAuditAction =
  | "org.created"
  | "org.switched"
  | "org.invite.created"
  | "org.invite.accepted"
  | "org.member.role_changed"
  | "org.member.removed"
  | "org.member.ownership_transferred";

export async function logOrgAudit(params: {
  organizationId: string;
  actorUserId?: string | null;
  action: OrgAuditAction;
  targetType?: string;
  targetId?: string;
  outcome?: "success" | "forbidden" | "error";
  metadata?: Record<string, unknown>;
}) {
  await db.orgAuditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId ?? null,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      outcome: params.outcome ?? "success",
      metadata: params.metadata,
    },
  });
}
