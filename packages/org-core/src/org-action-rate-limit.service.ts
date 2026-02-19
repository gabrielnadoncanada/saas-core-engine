export interface OrgActionRateLimitRepo {
  incrementAndGetCount(params: {
    scope: string;
    windowStart: Date;
  }): Promise<number>;
}

export type OrgAction = "org.invite.create";

export type OrgActionRateLimitPolicy = {
  enabled: boolean;
  windowSeconds: number;
  maxRequestsPerActor: number;
  maxRequestsPerIp: number;
};

export const ORG_ACTION_RATE_LIMIT_ERROR_CODE = "ORG_ACTION_RATE_LIMITED";

function windowStart(windowSeconds: number, now = new Date()): Date {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

function asScope(input: string): string {
  return input.toLowerCase().trim();
}

export function isOrgActionRateLimitError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message === ORG_ACTION_RATE_LIMIT_ERROR_CODE
  );
}

export class OrgActionRateLimitService {
  constructor(
    private readonly repo: OrgActionRateLimitRepo,
    private readonly policy: OrgActionRateLimitPolicy,
  ) {}

  async enforce(params: {
    action: OrgAction;
    organizationId: string;
    actorUserId: string;
    ip: string;
    targetEmail?: string;
  }): Promise<void> {
    if (!this.policy.enabled) return;

    const ws = windowStart(this.policy.windowSeconds);

    const actorScope = asScope(
      `${params.action}:org:${params.organizationId}:actor:${params.actorUserId}`,
    );
    const ipScope = asScope(
      `${params.action}:org:${params.organizationId}:ip:${params.ip}`,
    );
    const emailScope = params.targetEmail
      ? asScope(
          `${params.action}:org:${params.organizationId}:email:${params.targetEmail}`,
        )
      : null;

    const checks: Array<{ scope: string; max: number }> = [
      {
        scope: actorScope,
        max: this.policy.maxRequestsPerActor,
      },
      {
        scope: ipScope,
        max: this.policy.maxRequestsPerIp,
      },
    ];

    if (emailScope) {
      checks.push({
        scope: emailScope,
        max: this.policy.maxRequestsPerActor,
      });
    }

    for (const check of checks) {
      const count = await this.repo.incrementAndGetCount({
        scope: check.scope,
        windowStart: ws,
      });

      if (count > check.max) {
        throw new Error(ORG_ACTION_RATE_LIMIT_ERROR_CODE);
      }
    }
  }
}
