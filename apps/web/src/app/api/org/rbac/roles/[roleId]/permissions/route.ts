import { NextResponse } from "next/server";
import { orgRolePermissionsBodySchema } from "@contracts";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { withApiTelemetry, getActiveTraceContext } from "@/server/telemetry/otel";
import { setRolePermissions } from "@/server/services/org-rbac.service";
import { logOrgAudit } from "@/server/services/org-audit.service";
import { extractClientIp } from "@/server/http/request-ip";

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

        await logOrgAudit({
          organizationId: orgCtx.organizationId,
          actorUserId: orgCtx.userId,
          action: "org.roles.updated",
          targetType: "role",
          targetId: roleId,
          diff: {
            operation: "role.permissions.replace",
            permissions: parsed.data.permissions,
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
