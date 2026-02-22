import { orgRolePermissionsBodySchema } from "@contracts";
import { NextResponse } from "next/server";

import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { setRolePermissions } from "@/server/services/org-rbac.service";
import { withApiTelemetry } from "@/server/telemetry/otel";

type RouteContext = {
  params: Promise<{ roleId: string }>;
};

export async function PUT(req: Request, ctx: RouteContext) {
  return withApiTelemetry(req, "/api/org/rbac/roles/[roleId]/permissions", async () =>
    withRequiredOrgScope({
      action: "org:rbac:manage",
      run: async (orgCtx) => {
        const { roleId } = await ctx.params;
        const parsed = orgRolePermissionsBodySchema.safeParse(await req.json());
        if (!parsed.success) {
          return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
        }

        await setRolePermissions({
          organizationId: orgCtx.organizationId,
          roleId,
          permissions: parsed.data.permissions,
        });

        return NextResponse.json({ ok: true });
      },
    }),
  );
}
