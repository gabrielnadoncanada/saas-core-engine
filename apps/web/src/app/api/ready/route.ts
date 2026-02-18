import { NextResponse } from "next/server";
import { prisma } from "@db";
import { env } from "@/server/config/env";
import { logError, logInfo } from "@/server/logging/logger";
import { getOrCreateRequestId, withRequestId } from "@/server/http/request-context";
import { withApiTelemetry } from "@/server/telemetry/otel";

type ReadinessState = "ok" | "error";

export async function GET(req: Request) {
  return withApiTelemetry(req, "/api/ready", async () => {
    const requestId = getOrCreateRequestId(req);
    const startedAt = Date.now();

    let db: ReadinessState = "ok";
    let dbError: string | null = null;

    try {
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (error) {
      db = "error";
      dbError = error instanceof Error ? error.message : "db_unavailable";
    }

    const emailConfigured = Boolean(env.RESEND_API_KEY);
    const stripeConfigured = Boolean(
      env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_PUBLISHABLE_KEY,
    );
    const ready = db === "ok";

    const payload = {
      ok: ready,
      service: "web",
      status: ready ? "ready" : "not_ready",
      checks: {
        db,
        emailConfigured,
        stripeConfigured,
      },
      errors: dbError ? { db: dbError } : {},
      durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    };

    if (ready) {
      logInfo("system.ready.ok", { requestId, durationMs: payload.durationMs });
    } else {
      logError("system.ready.failed", {
        requestId,
        durationMs: payload.durationMs,
        errors: payload.errors,
      });
    }

    return withRequestId(
      NextResponse.json(payload, { status: ready ? 200 : 503 }),
      requestId,
    );
  });
}
