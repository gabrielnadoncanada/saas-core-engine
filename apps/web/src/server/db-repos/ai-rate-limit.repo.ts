import { prisma } from "@db";

export class AIRateLimitRepo {
  async incrementOrgMinuteBucket(params: {
    organizationId: string;
    windowStart: Date;
  }): Promise<{ count: number; windowStart: Date }> {
    const bucket = await prisma.aIRateLimitBucket.upsert({
      where: {
        organizationId_windowStart: {
          organizationId: params.organizationId,
          windowStart: params.windowStart,
        },
      },
      create: {
        organizationId: params.organizationId,
        windowStart: params.windowStart,
        count: 1,
      },
      update: { count: { increment: 1 } },
      select: { count: true, windowStart: true },
    });

    return { count: bucket.count, windowStart: bucket.windowStart };
  }
}

