import { NextResponse } from "next/server";

import { getImpersonationTokenFromCookie, clearImpersonationCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import { requireUser } from "@/server/auth/require-user";
import { extractClientIp } from "@/server/http/request-ip";
import { stopImpersonation } from "@/server/services/impersonation.service";
import { logOrgAudit } from "@/server/services/org-audit.service";
import { withApiTelemetry, getActiveTraceContext } from "@/server/telemetry/otel";

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/org/impersonation/stop", async () => {
    const user = await requireUser();
    const token = await getImpersonationTokenFromCookie();
    if (!token) {
      await clearImpersonationCookie();
      return NextResponse.json({ ok: true, stopped: false });
    }

    const stopped = await stopImpersonation({
      token,
      actorUserId: user.impersonation?.actorUserId ?? user.userId,
    });

    await clearImpersonationCookie();

    if (stopped) {
      await logOrgAudit({
        organizationId: stopped.organizationId,
        actorUserId: stopped.actorUserId,
        action: "org.impersonation.stopped",
        targetType: "user",
        targetId: stopped.targetUserId,
        target: { userId: stopped.targetUserId },
        ip: extractClientIp(req),
        userAgent: req.headers.get("user-agent"),
        traceId: getActiveTraceContext()?.traceId ?? null,
        metadata: { impersonationSessionId: stopped.id },
      });
    }

    return NextResponse.json({ ok: true, stopped: Boolean(stopped) });
  });
}
