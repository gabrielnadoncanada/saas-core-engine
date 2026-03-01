import "server-only";

import { AuditLogsRepo } from "@/server/db-repos/audit-logs.repo";
import { extractClientIp } from "@/server/http/request-ip";
import { getActiveTraceContext } from "@/server/telemetry/otel";

const logsRepo = new AuditLogsRepo();

export async function writeAuditLog(params: {
  request?: Request;
  actorUserId?: string | null;
  organizationId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  result: "success" | "failure";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const ip = params.request ? extractClientIp(params.request) || null : null;
  const userAgent = params.request?.headers.get("user-agent") ?? null;
  const trace = getActiveTraceContext();

  await logsRepo.create({
    actorUserId: params.actorUserId ?? null,
    organizationId: params.organizationId ?? null,
    action: params.action,
    targetType: params.targetType ?? null,
    targetId: params.targetId ?? null,
    result: params.result,
    ip,
    userAgent,
    traceId: trace?.traceId ?? null,
    metadata: params.metadata ?? null,
  });
}

