import type { SessionService } from "../sessions/session.service";

export interface SessionContextUsersRepo {
  findActiveOrganizationId(userId: string): Promise<string | null>;
  setActiveOrganization(userId: string, organizationId: string): Promise<void>;
}

export interface SessionContextMembershipsRepo {
  hasMembership(params: { userId: string; organizationId: string }): Promise<boolean>;
  findFirstOrganizationIdByUser(userId: string): Promise<string | null>;
}

export interface ResolveSessionContextParams {
  sessionToken: string;
  idleTimeoutMinutes: number;
}

export interface SessionContextResult {
  userId: string;
  sessionId: string;
  organizationId: string;
}

export class SessionContextService {
  constructor(
    private readonly sessions: SessionService,
    private readonly users: SessionContextUsersRepo,
    private readonly memberships: SessionContextMembershipsRepo,
  ) {}

  async resolve(
    params: ResolveSessionContextParams,
  ): Promise<SessionContextResult | null> {
    const valid = await this.sessions.validateSession({
      sessionToken: params.sessionToken,
      idleTimeoutMinutes: params.idleTimeoutMinutes,
    });
    if (!valid) return null;

    const activeOrgId = await this.users.findActiveOrganizationId(valid.userId);
    let organizationId: string | null = null;

    if (activeOrgId) {
      const hasMembership = await this.memberships.hasMembership({
        userId: valid.userId,
        organizationId: activeOrgId,
      });
      if (hasMembership) {
        organizationId = activeOrgId;
      }
    }

    if (!organizationId) {
      organizationId = await this.memberships.findFirstOrganizationIdByUser(
        valid.userId,
      );
      if (!organizationId) return null;

      if (activeOrgId !== organizationId) {
        await this.users.setActiveOrganization(valid.userId, organizationId);
      }
    }

    return {
      userId: valid.userId,
      sessionId: valid.sessionId,
      organizationId,
    };
  }
}

