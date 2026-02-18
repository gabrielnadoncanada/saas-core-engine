import { NextResponse } from "next/server";
import { orgMembershipIdBodySchema } from "@contracts";
import { orgErrorResponse } from "@/server/auth/org-error-response";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { createMembershipService } from "@/server/adapters/core/org-core.adapter";
import { logOrgAudit } from "@/server/services/org-audit.service";
import { withApiTelemetry } from "@/server/telemetry/otel";

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/org/members/remove", async () => {
    const parsed = orgMembershipIdBodySchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }

    const { membershipId } = parsed.data;

    try {
      return await withRequiredOrgScope({
        action: "org:member:remove",
        run: async (orgCtx) => {
          const memberships = createMembershipService();
          await memberships.removeMember({
            actorUserId: orgCtx.userId,
            organizationId: orgCtx.organizationId,
            membershipId,
          });

          await logOrgAudit({
            organizationId: orgCtx.organizationId,
            actorUserId: orgCtx.userId,
            action: "org.member.removed",
            targetType: "membership",
            targetId: membershipId,
          });

          return NextResponse.json({ ok: true });
        },
      });
    } catch (error) {
      return orgErrorResponse(error);
    }
  });
}
