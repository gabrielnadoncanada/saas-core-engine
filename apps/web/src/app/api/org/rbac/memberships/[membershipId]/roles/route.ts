import { orgMembershipRolesBodySchema } from "@contracts";
import { NextResponse } from "next/server";

import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { setMembershipCustomRoles } from "@/server/services/org-rbac.service";
import { withApiTelemetry } from "@/server/telemetry/otel";

type RouteContext = {
  params: Promise<{ membershipId: string }>;
};

export async function PUT(req: Request, ctx: RouteContext) {
  return withApiTelemetry(req, "/api/org/rbac/memberships/[membershipId]/roles", async () =>
    withRequiredOrgScope({
      action: "org:rbac:manage",
      run: async (orgCtx) => {
        const { membershipId } = await ctx.params;
        const parsed = orgMembershipRolesBodySchema.safeParse(await req.json());
        if (!parsed.success) {
          return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
        }

        await setMembershipCustomRoles({
          organizationId: orgCtx.organizationId,
          membershipId,
          roleIds: parsed.data.roleIds,
        });

        return NextResponse.json({ ok: true });
      },
    }),
  );
}
