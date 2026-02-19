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

export type OrgAuditLog = {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  target: unknown;
  diff: unknown;
  ip: string | null;
  userAgent: string | null;
  traceId: string | null;
  outcome: string;
  metadata: unknown;
  createdAt: Date;
};

export interface OrgAuditRepo {
  createLog(params: {
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
  }): Promise<void>;
  findMany(params: {
    organizationId: string;
    filters?: OrgAuditFilters;
    page: number;
    pageSize: number;
    sortDir: "asc" | "desc";
  }): Promise<OrgAuditLog[]>;
  count(params: {
    organizationId: string;
    filters?: OrgAuditFilters;
  }): Promise<number>;
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

export class OrgAuditService {
  constructor(private readonly repo: OrgAuditRepo) {}

  log(params: {
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
    return this.repo.createLog(params);
  }

  async query(params: {
    organizationId: string;
    filters?: OrgAuditFilters;
    page?: number;
    pageSize?: number;
    sortDir?: "asc" | "desc";
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 25));

    const [rows, total] = await Promise.all([
      this.repo.findMany({
        organizationId: params.organizationId,
        filters: params.filters,
        page,
        pageSize,
        sortDir: params.sortDir ?? "desc",
      }),
      this.repo.count({
        organizationId: params.organizationId,
        filters: params.filters,
      }),
    ]);

    return {
      rows,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}
