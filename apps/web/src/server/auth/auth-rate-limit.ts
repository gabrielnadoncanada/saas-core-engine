import "server-only";

import { authErr, buildAuthRateLimitKey, type AuthRateLimitRoute } from "@auth-core";
import { prisma } from "@db";
import { env } from "@/server/config/env";

function windowStart(windowSeconds: number, now = new Date()): Date {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

function extractIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return "127.0.0.1";
}

export async function enforceAuthRateLimit(
  req: Request,
  route: AuthRateLimitRoute,
): Promise<void> {
  if (!env.RATE_LIMIT_ENABLED) return;

  const ip = extractIp(req);
  const key = buildAuthRateLimitKey({ ip, route });
  const ws = windowStart(env.RATE_LIMIT_WINDOW_SECONDS);

  const bucket = await (prisma as any).authRateLimitBucket.upsert({
    where: { key_windowStart: { key, windowStart: ws } },
    create: { key, windowStart: ws, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  if (bucket.count > env.RATE_LIMIT_MAX_REQUESTS) {
    throw authErr("rate_limited", "Too many requests. Please try again later.");
  }
}
