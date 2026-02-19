import { orgMembershipRolesBodySchema } from "@contracts";
import { NextResponse } from "next/server";

import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { extractClientIp } from "@/server/http/request-ip";
import { logOrgAudit } from "@/server/services/org-audit.service";
import { setMembershipCustomRoles } from "@/server/services/org-rbac.service";
import { withApiTelemetry, getActiveTraceContext } from "@/server/telemetry/otel";

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

        await logOrgAudit({
          organizationId: orgCtx.organizationId,
          actorUserId: orgCtx.userId,
          action: "org.roles.updated",
          targetType: "membership",
          targetId: membershipId,
          diff: {
            operation: "membership.roles.replace",
            roleIds: parsed.data.roleIds,
          },
          ip: extractClientIp(req),
          userAgent: req.headers.get("user-agent"),
          traceId: getActiveTraceContext()?.traceId ?? null,
        });

        return NextResponse.json({ ok: true });
      },
    }),
  );
}
