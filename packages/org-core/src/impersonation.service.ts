import { orgErr } from "./errors";
import type { MembershipsRepo } from "./org.ports";

export interface ImpersonationTokenCodec {
  randomToken(): string;
  hashToken(rawToken: string): string;
}

export interface ImpersonationSessionsRepo {
  create(params: {
    organizationId: string;
    actorUserId: string;
    targetUserId: string;
    tokenHash: string;
    actorIp?: string | null;
    actorUserAgent?: string | null;
    traceId?: string | null;
  }): Promise<{ id: string }>;
  findActiveByTokenHash(tokenHash: string): Promise<{
    id: string;
    organizationId: string;
    actorUserId: string;
    targetUserId: string;
  } | null>;
  findActiveByTokenHashAndActor(params: {
    tokenHash: string;
    actorUserId: string;
  }): Promise<{ id: string } | null>;
  endById(params: { id: string; reason: string }): Promise<{
    id: string;
    organizationId: string;
    actorUserId: string;
    targetUserId: string;
  }>;
}

export class ImpersonationService<TTx = unknown> {
  constructor(
    private readonly memberships: MembershipsRepo<TTx>,
    private readonly sessions: ImpersonationSessionsRepo,
    private readonly tokens: ImpersonationTokenCodec,
  ) {}

  async start(params: {
    organizationId: string;
    actorUserId: string;
    targetUserId: string;
    ip?: string | null;
    userAgent?: string | null;
    traceId?: string | null;
  }) {
    const membership = await this.memberships.findUserMembership({
      userId: params.targetUserId,
      organizationId: params.organizationId,
    });

    if (!membership) {
      throw orgErr("forbidden", "Target user is not a member of organization");
    }

    if (membership.role === "owner") {
      throw orgErr("forbidden", "Owner impersonation is not allowed", {
        reason: "target_owner_blocked",
      });
    }

    const token = this.tokens.randomToken();
    const tokenHash = this.tokens.hashToken(token);

    const session = await this.sessions.create({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      targetUserId: membership.userId,
      tokenHash,
      actorIp: params.ip ?? null,
      actorUserAgent: params.userAgent ?? null,
      traceId: params.traceId ?? null,
    });

    return {
      token,
      session,
      target: { userId: membership.userId, role: membership.role },
    };
  }

  async resolveActiveImpersonation(token: string) {
    const tokenHash = this.tokens.hashToken(token);
    return this.sessions.findActiveByTokenHash(tokenHash);
  }

  async stop(params: {
    token: string;
    actorUserId: string;
    reason?: string;
  }) {
    const tokenHash = this.tokens.hashToken(params.token);

    const existing = await this.sessions.findActiveByTokenHashAndActor({
      tokenHash,
      actorUserId: params.actorUserId,
    });

    if (!existing) return null;

    return this.sessions.endById({
      id: existing.id,
      reason: params.reason ?? "manual",
    });
  }
}
