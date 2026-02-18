import { prisma } from "@db";
import { env } from "@/server/config/env";
import { extractClientIp } from "@/server/http/request-ip";

const ORG_ACTION_RATE_LIMIT_ERROR_CODE = "ORG_ACTION_RATE_LIMITED";

type OrgAction = "org.invite.create";

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

export async function enforceOrgActionRateLimit(
  req: Request,
  params: {
    action: OrgAction;
    organizationId: string;
    actorUserId: string;
    targetEmail?: string;
  },
): Promise<void> {
  if (!env.ORG_INVITE_RATE_LIMIT_ENABLED) return;

  const ws = windowStart(env.ORG_INVITE_RATE_LIMIT_WINDOW_SECONDS);
  const ip = extractClientIp(req);

  const actorScope = asScope(
    `${params.action}:org:${params.organizationId}:actor:${params.actorUserId}`,
  );
  const ipScope = asScope(`${params.action}:org:${params.organizationId}:ip:${ip}`);
  const emailScope = params.targetEmail
    ? asScope(
        `${params.action}:org:${params.organizationId}:email:${params.targetEmail}`,
      )
    : null;

  const checks: Array<{ scope: string; max: number }> = [
    {
      scope: actorScope,
      max: env.ORG_INVITE_RATE_LIMIT_MAX_REQUESTS_PER_ACTOR,
    },
    {
      scope: ipScope,
      max: env.ORG_INVITE_RATE_LIMIT_MAX_REQUESTS_PER_IP,
    },
  ];

  if (emailScope) {
    checks.push({
      scope: emailScope,
      max: env.ORG_INVITE_RATE_LIMIT_MAX_REQUESTS_PER_ACTOR,
    });
  }

  for (const check of checks) {
    const bucket = await (prisma as any).orgActionRateLimitBucket.upsert({
      where: {
        scope_windowStart: {
          scope: check.scope,
          windowStart: ws,
        },
      },
      create: {
        scope: check.scope,
        windowStart: ws,
        count: 1,
      },
      update: { count: { increment: 1 } },
      select: { count: true },
    });

    if (bucket.count > check.max) {
      throw new Error(ORG_ACTION_RATE_LIMIT_ERROR_CODE);
    }
  }
}
