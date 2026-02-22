import { orgMemberRoleChangeBodySchema } from "@contracts";
import { NextResponse } from "next/server";

import { createMembershipService } from "@/server/adapters/core/org-core.adapter";
import { orgErrorResponse } from "@/server/auth/org-error-response";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { withApiTelemetry } from "@/server/telemetry/otel";

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/org/members/role", async () => {
    const parsed = orgMemberRoleChangeBodySchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }

    const { membershipId, role } = parsed.data;

    try {
      return await withRequiredOrgScope({
        action: "org:member:role:change",
        targetRole: role,
        run: async (orgCtx) => {
          const memberships = createMembershipService();
          await memberships.changeMemberRole({
            actorUserId: orgCtx.userId,
            organizationId: orgCtx.organizationId,
            membershipId,
            role,
          });

          return NextResponse.json({ ok: true });
        },
      });
    } catch (error) {
      return orgErrorResponse(error);
    }
  });
}

