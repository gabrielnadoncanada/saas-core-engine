import "server-only";

import { createHash } from "node:crypto";

import { authErr, buildAuthRateLimitKey, type AuthRateLimitRoute } from "@auth-core";
import { prisma } from "@db";

import { env } from "@/server/config/env";
import { extractClientIp } from "@/server/http/request-ip";
import { incrementMetric } from "@/server/metrics/metrics";

const RATE_LIMIT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastRateLimitCleanupAt = 0;

function windowStart(windowSeconds: number, now = new Date()): Date {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

async function cleanupOldRateLimitBuckets(nowMs: number): Promise<void> {
  if (nowMs - lastRateLimitCleanupAt < RATE_LIMIT_CLEANUP_INTERVAL_MS) return;

  lastRateLimitCleanupAt = nowMs;
  const cutoff = new Date(nowMs - env.RATE_LIMIT_RETENTION_SECONDS * 1000);
  await prisma.authRateLimitBucket.deleteMany({
    where: { windowStart: { lt: cutoff } },
  });
}

export async function enforceAuthRateLimit(
  req: Request,
  route: AuthRateLimitRoute,
  options?: { identifier?: string | null },
): Promise<void> {
  if (!env.RATE_LIMIT_ENABLED) return;
  const nowMs = Date.now();

  // Best-effort housekeeping to keep limiter storage bounded.
  try {
    await cleanupOldRateLimitBuckets(nowMs);
  } catch {
    // Ignore cleanup failures to avoid blocking auth traffic.
  }

  const extractedIp = extractClientIp(req);
  const ip =
    extractedIp && extractedIp.length > 0
      ? extractedIp
      : `missing-ip:${createHash("sha256")
          .update(req.headers.get("user-agent") || "unknown")
          .digest("hex")
          .slice(0, 16)}`;
  const identifierHash =
    options?.identifier && options.identifier.trim().length > 0
      ? createHash("sha256")
          .update(options.identifier.trim().toLowerCase())
          .digest("hex")
          .slice(0, 24)
      : null;
  const key = buildAuthRateLimitKey({ ip, route, identifierHash });
  const ws = windowStart(env.RATE_LIMIT_WINDOW_SECONDS, new Date(nowMs));

  const bucket = await prisma.authRateLimitBucket.upsert({
    where: { key_windowStart: { key, windowStart: ws } },
    create: { key, windowStart: ws, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  if (bucket.count > env.RATE_LIMIT_MAX_REQUESTS) {
    incrementMetric("auth_rate_limited_total");
    throw authErr("rate_limited", "Too many requests. Please try again later.");
  }
}
