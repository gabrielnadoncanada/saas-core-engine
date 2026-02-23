import { NextResponse } from "next/server";

import { createInviteService } from "@/server/adapters/core/org-core.adapter";
import { withApiTelemetry } from "@/server/telemetry/otel";

export async function GET(req: Request) {
  return withApiTelemetry(req, "/api/org/invite/token", async () => {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (!token) {
      return NextResponse.json({ ok: false, error: "invalid_invite" }, { status: 400 });
    }

    const invites = createInviteService();
    const resolved = await invites.getInviteForToken(token);
    if (resolved.status !== "pending") {
      const error =
        resolved.status === "accepted"
          ? "invite_already_accepted"
          : resolved.status === "expired"
            ? "invite_expired"
            : "invalid_invite";
      return NextResponse.json({ ok: false, error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      invite: {
        email: resolved.invite.email,
        role: resolved.invite.role,
        organizationId: resolved.invite.organizationId,
        expiresAt: resolved.invite.expiresAt.toISOString(),
      },
    });
  });
}
