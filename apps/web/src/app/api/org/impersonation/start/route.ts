import { NextResponse } from "next/server";
import { orgImpersonationStartBodySchema } from "@contracts";
import { prisma } from "@db";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { withApiTelemetry, getActiveTraceContext } from "@/server/telemetry/otel";
import { extractClientIp } from "@/server/http/request-ip";
import { logOrgAudit } from "@/server/services/org-audit.service";
import { startImpersonation } from "@/server/services/impersonation.service";
import { setImpersonationCookie } from "@/server/adapters/cookies/session-cookie.adapter";

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/org/impersonation/start", async () =>
    withRequiredOrgScope({
      action: "org:impersonation:start",
      run: async (orgCtx) => {
        const parsed = orgImpersonationStartBodySchema.safeParse(await req.json());
        if (!parsed.success) {
          return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
        }

        const membership = await prisma.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: parsed.data.targetUserId,
              organizationId: orgCtx.organizationId,
            },
          },
          select: { role: true, userId: true },
        });

        if (!membership) {
          return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
        }

        if (membership.role === "owner") {
          await logOrgAudit({
            organizationId: orgCtx.organizationId,
            actorUserId: orgCtx.userId,
            action: "org.impersonation.started",
            targetType: "user",
            targetId: membership.userId,
            target: { userId: membership.userId, role: membership.role },
            outcome: "forbidden",
            ip: extractClientIp(req),
            userAgent: req.headers.get("user-agent"),
            traceId: getActiveTraceContext()?.traceId ?? null,
            metadata: { reason: "target_owner_blocked" },
          });
          return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
        }

        const started = await startImpersonation({
          organizationId: orgCtx.organizationId,
          actorUserId: orgCtx.userId,
          targetUserId: membership.userId,
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
          targetId: membership.userId,
          target: { userId: membership.userId, role: membership.role },
          ip: extractClientIp(req),
          userAgent: req.headers.get("user-agent"),
          traceId: getActiveTraceContext()?.traceId ?? null,
          metadata: { impersonationSessionId: started.session.id },
        });

        return NextResponse.json({
          ok: true,
          impersonation: {
            sessionId: started.session.id,
            targetUserId: membership.userId,
          },
        });
      },
    }),
  );
}
