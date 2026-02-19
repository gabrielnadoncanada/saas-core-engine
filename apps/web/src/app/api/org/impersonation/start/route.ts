import { orgImpersonationStartBodySchema } from "@contracts";
import { OrgCoreError } from "@org-core";
import { NextResponse } from "next/server";

import { setImpersonationCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { extractClientIp } from "@/server/http/request-ip";
import { startImpersonation } from "@/server/services/impersonation.service";
import { logOrgAudit } from "@/server/services/org-audit.service";
import { withApiTelemetry, getActiveTraceContext } from "@/server/telemetry/otel";

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/org/impersonation/start", async () =>
    withRequiredOrgScope({
      action: "org:impersonation:start",
      run: async (orgCtx) => {
        const parsed = orgImpersonationStartBodySchema.safeParse(await req.json());
        if (!parsed.success) {
          return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
        }

        try {
          const started = await startImpersonation({
            organizationId: orgCtx.organizationId,
            actorUserId: orgCtx.userId,
            targetUserId: parsed.data.targetUserId,
            ip: extractClientIp(req),
            userAgent: req.headers.get("user-agent"),
            traceId: getActiveTraceContext()?.traceId ?? null,
          });

          await setImpersonationCookie(started.token);

          await logOrgAudit({
            organizationId: orgCtx.organizationId,
            actorUserId: orgCtx.userId,
            action: "org.impersonation.started",
            targetType: "user",
            targetId: started.target.userId,
            target: started.target,
            ip: extractClientIp(req),
            userAgent: req.headers.get("user-agent"),
            traceId: getActiveTraceContext()?.traceId ?? null,
            metadata: { impersonationSessionId: started.session.id },
          });

          return NextResponse.json({
            ok: true,
            impersonation: {
              sessionId: started.session.id,
              targetUserId: started.target.userId,
            },
          });
        } catch (error) {
          if (!(error instanceof OrgCoreError) || error.code !== "forbidden") {
            throw error;
          }

          await logOrgAudit({
            organizationId: orgCtx.organizationId,
            actorUserId: orgCtx.userId,
            action: "org.impersonation.started",
            targetType: "user",
            targetId: parsed.data.targetUserId,
            outcome: "forbidden",
            ip: extractClientIp(req),
            userAgent: req.headers.get("user-agent"),
            traceId: getActiveTraceContext()?.traceId ?? null,
            metadata:
              error.details && typeof error.details === "object"
                ? (error.details as Record<string, unknown>)
                : undefined,
          });
          return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
        }
      },
    }),
  );
}
