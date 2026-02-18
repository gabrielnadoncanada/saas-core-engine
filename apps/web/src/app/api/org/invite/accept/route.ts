import { OrgCoreError } from "@org-core";
import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/require-user";
import { createInviteService } from "@/server/adapters/core/org-core.adapter";
import { logOrgAudit } from "@/server/services/org-audit.service";
import { withApiTelemetry } from "@/server/telemetry/otel";

export async function GET(req: Request) {
  return withApiTelemetry(req, "/api/org/invite/accept", async () => {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token)
      return NextResponse.redirect(
        new URL("/dashboard/team?invite=invalid", req.url),
      );

    const invites = createInviteService();

    try {
      const accepted = await invites.acceptInvite({
        token,
        acceptUserId: user.userId,
      });
      await logOrgAudit({
        organizationId: accepted.organizationId,
        actorUserId: user.userId,
        action: "org.invite.accepted",
        metadata: {},
      });
      return NextResponse.redirect(
        new URL("/dashboard/team?invite=accepted", req.url),
      );
    } catch (e) {
      if (e instanceof OrgCoreError && e.code !== "unauthorized") {
        const maybeOrgId = user.organizationId;
        await logOrgAudit({
          organizationId: maybeOrgId,
          actorUserId: user.userId,
          action: "org.invite.accepted",
          outcome: e.code === "forbidden" ? "forbidden" : "error",
          metadata: { reason: e.code },
        });
      }
      const code =
        e instanceof OrgCoreError
          ? e.code === "invite_email_mismatch"
            ? "email_mismatch"
            : e.code === "invalid_invite"
              ? "invalid"
              : "failed"
          : "failed";

      return NextResponse.redirect(
        new URL(`/dashboard/team?invite=${code}`, req.url),
      );
    }
  });
}
