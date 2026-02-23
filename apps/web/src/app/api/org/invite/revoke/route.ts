import { orgInviteRevokeBodySchema } from "@contracts";
import { NextResponse } from "next/server";

import { createInviteService } from "@/server/adapters/core/org-core.adapter";
import { orgErrorResponse } from "@/server/auth/org-error-response";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { withApiTelemetry } from "@/server/telemetry/otel";

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/org/invite/revoke", async () => {
    const parsed = orgInviteRevokeBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }

    try {
      return await withRequiredOrgScope({
        action: "org:invite:create",
        run: async (orgCtx) => {
          const invites = createInviteService();
          await invites.revokeInvite({
            actorUserId: orgCtx.userId,
            organizationId: orgCtx.organizationId,
            invitationId: parsed.data.invitationId,
          });

          return NextResponse.json({ ok: true });
        },
      });
    } catch (error) {
      return orgErrorResponse(error);
    }
  });
}
