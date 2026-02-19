import { prisma } from "@db";
import {
  OrgActionRateLimitService,
  isOrgActionRateLimitError,
  type OrgAction,
} from "@org-core";

import { env } from "@/server/config/env";
import { extractClientIp } from "@/server/http/request-ip";

class PrismaOrgActionRateLimitRepo {
  async incrementAndGetCount(params: {
    scope: string;
    windowStart: Date;
  }): Promise<number> {
    const bucket = await prisma.orgActionRateLimitBucket.upsert({
      where: {
        scope_windowStart: {
          scope: params.scope,
          windowStart: params.windowStart,
        },
      },
      create: {
        scope: params.scope,
        windowStart: params.windowStart,
        count: 1,
      },
      update: { count: { increment: 1 } },
      select: { count: true },
    });

    return bucket.count;
  }
}

const service = new OrgActionRateLimitService(new PrismaOrgActionRateLimitRepo(), {
  enabled: env.ORG_INVITE_RATE_LIMIT_ENABLED,
  windowSeconds: env.ORG_INVITE_RATE_LIMIT_WINDOW_SECONDS,
  maxRequestsPerActor: env.ORG_INVITE_RATE_LIMIT_MAX_REQUESTS_PER_ACTOR,
  maxRequestsPerIp: env.ORG_INVITE_RATE_LIMIT_MAX_REQUESTS_PER_IP,
});

export { isOrgActionRateLimitError };

export async function enforceOrgActionRateLimit(
  req: Request,
  params: {
    action: OrgAction;
    organizationId: string;
    actorUserId: string;
    targetEmail?: string;
  },
): Promise<void> {
  await service.enforce({
    action: params.action,
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    targetEmail: params.targetEmail,
    ip: extractClientIp(req),
  });
}
