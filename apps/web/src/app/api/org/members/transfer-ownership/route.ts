import { orgMembershipIdBodySchema } from "@contracts";
import { NextResponse } from "next/server";

import { createMembershipService } from "@/server/adapters/core/org-core.adapter";
import { orgErrorResponse } from "@/server/auth/org-error-response";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { logOrgAudit } from "@/server/services/org-audit.service";
import { withApiTelemetry } from "@/server/telemetry/otel";

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/org/members/transfer-ownership", async () => {
    const parsed = orgMembershipIdBodySchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }

    const { membershipId } = parsed.data;

    try {
      return await withRequiredOrgScope({
        action: "org:member:transfer_ownership",
        run: async (orgCtx) => {
          const memberships = createMembershipService();
          await memberships.transferOwnership({
            currentOwnerUserId: orgCtx.userId,
            organizationId: orgCtx.organizationId,
            nextOwnerMembershipId: membershipId,
          });

          await logOrgAudit({
            organizationId: orgCtx.organizationId,
            actorUserId: orgCtx.userId,
            action: "org.member.ownership_transferred",
            targetType: "membership",
            targetId: membershipId,
            metadata: {
              impersonation: orgCtx.impersonation
                ? {
                    actorUserId: orgCtx.impersonation.actorUserId,
                    targetUserId: orgCtx.impersonation.targetUserId,
                  }
                : null,
            },
          });

          return NextResponse.json({ ok: true });
        },
      });
    } catch (error) {
      return orgErrorResponse(error);
    }
  });
}
