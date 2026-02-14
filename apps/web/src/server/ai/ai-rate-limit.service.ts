import "server-only";

import { prisma } from "@db";

function minuteWindowStart(now = new Date()) {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    0,
    0,
  );
}

export async function enforceRpmOrThrow(orgId: string, rpm: number) {
  const windowStart = minuteWindowStart();

  const bucket = await prisma.aIRateLimitBucket.upsert({
    where: {
      organizationId_windowStart: { organizationId: orgId, windowStart },
    },
    create: { organizationId: orgId, windowStart, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true, windowStart: true },
  });

  if (bucket.count > rpm) {
    const err = new Error("Rate limit exceeded. Please slow down.");
    // @ts-expect-error attach
    err.status = 429;
    // @ts-expect-error attach
    err.meta = {
      rpm,
      windowStart: bucket.windowStart.toISOString(),
      count: bucket.count,
    };
    throw err;
  }

  return {
    rpm,
    windowStart: bucket.windowStart.toISOString(),
    count: bucket.count,
  };
}
