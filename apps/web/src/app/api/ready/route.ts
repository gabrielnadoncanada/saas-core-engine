import { prisma } from "@db";
import { NextResponse } from "next/server";

import { env } from "@/server/config/env";
import { getOrCreateRequestId, withRequestId } from "@/server/http/request-context";
import { logError, logInfo } from "@/server/logging/logger";
import { incrementMetric } from "@/server/metrics/metrics";
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
    const oauthGoogleConfigured = !env.AUTH_SIGNIN_GOOGLE_ENABLED
      ? true
      : Boolean(
          env.GOOGLE_OAUTH_CLIENT_ID &&
            env.GOOGLE_OAUTH_CLIENT_SECRET &&
            env.GOOGLE_OAUTH_REDIRECT_URI,
        );
    const oauthGithubConfigured = !env.AUTH_SIGNIN_GITHUB_ENABLED
      ? true
      : Boolean(
          env.GITHUB_OAUTH_CLIENT_ID &&
            env.GITHUB_OAUTH_CLIENT_SECRET &&
            env.GITHUB_OAUTH_REDIRECT_URI,
        );
    const emailReady = env.NODE_ENV === "production" ? emailConfigured : true;
    const billingReady = env.BILLING_ENABLED ? stripeConfigured : true;
    const ready =
      db === "ok" && emailReady && billingReady && oauthGoogleConfigured && oauthGithubConfigured;

    const payload = {
      ok: ready,
      service: "web",
      status: ready ? "ready" : "not_ready",
      checks: {
        db,
        emailConfigured,
        stripeConfigured,
        oauthGoogleConfigured,
        oauthGithubConfigured,
        billingEnabled: env.BILLING_ENABLED,
      },
      errors: {
        ...(dbError ? { db: dbError } : {}),
        ...(!emailReady ? { email: "email_provider_not_configured" } : {}),
        ...(!billingReady ? { billing: "stripe_not_configured" } : {}),
        ...(!oauthGoogleConfigured ? { oauthGoogle: "google_oauth_not_configured" } : {}),
        ...(!oauthGithubConfigured ? { oauthGithub: "github_oauth_not_configured" } : {}),
      },
      durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    };

    if (ready) {
      incrementMetric("ready_ok_total");
      logInfo("system.ready.ok", { requestId, durationMs: payload.durationMs });
    } else {
      incrementMetric("ready_not_ready_total");
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
