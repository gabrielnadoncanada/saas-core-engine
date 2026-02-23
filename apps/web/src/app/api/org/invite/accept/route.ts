import { OrgCoreError } from "@org-core";
import { NextResponse } from "next/server";

import { createInviteService } from "@/server/adapters/core/org-core.adapter";
import { getSessionUser } from "@/server/auth/require-user";
import { withApiTelemetry } from "@/server/telemetry/otel";

export async function GET(req: Request) {
  return withApiTelemetry(req, "/api/org/invite/accept", async () => {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token)
      return NextResponse.redirect(
        new URL("/dashboard/team?invite=invalid", req.url),
      );

    let user = null;
    try {
      user = await getSessionUser();
    } catch {
      user = null;
    }

    if (!user) {
      const redirectPath = `/api/org/invite/accept?token=${encodeURIComponent(token)}`;
      return NextResponse.redirect(
        new URL(
          `/signup?invite=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirectPath)}`,
          req.url,
        ),
      );
    }

    const invites = createInviteService();

    try {
      await invites.acceptInvite({
        token,
        acceptUserId: user.userId,
      });
      return NextResponse.redirect(
        new URL("/dashboard", req.url),
      );
    } catch (e) {
      const code =
        e instanceof OrgCoreError
          ? e.code === "invite_email_mismatch"
            ? "email_mismatch"
            : e.code === "invite_expired"
              ? "expired"
              : e.code === "invite_already_accepted"
                ? "already_accepted"
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

