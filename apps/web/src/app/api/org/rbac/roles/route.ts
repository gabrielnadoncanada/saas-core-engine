import { NextResponse } from "next/server";
import { orgRoleCreateBodySchema } from "@contracts";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { withApiTelemetry } from "@/server/telemetry/otel";
import { createOrgRole, listOrgRoles } from "@/server/services/org-rbac.service";
import { logOrgAudit } from "@/server/services/org-audit.service";
import { extractClientIp } from "@/server/http/request-ip";
import { getActiveTraceContext } from "@/server/telemetry/otel";

export async function GET(req: Request) {
  return withApiTelemetry(req, "/api/org/rbac/roles", async () =>
    withRequiredOrgScope({
      action: "org:rbac:manage",
      run: async (orgCtx) => {
        const roles = await listOrgRoles(orgCtx.organizationId);
        return NextResponse.json({ ok: true, roles });
      },
    }),
  );
}

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/org/rbac/roles", async () =>
    withRequiredOrgScope({
      action: "org:rbac:manage",
      run: async (orgCtx) => {
        const parsed = orgRoleCreateBodySchema.safeParse(await req.json());
        if (!parsed.success) {
          return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
        }

        const role = await createOrgRole({
          organizationId: orgCtx.organizationId,
          name: parsed.data.name,
          description: parsed.data.description,
          createdByUserId: orgCtx.userId,
        });

        await logOrgAudit({
          organizationId: orgCtx.organizationId,
          actorUserId: orgCtx.userId,
          action: "org.roles.updated",
          targetType: "role",
          targetId: role.id,
          target: { roleId: role.id, roleKey: role.key },
          diff: { operation: "role.create", name: role.name },
          ip: extractClientIp(req),
          userAgent: req.headers.get("user-agent"),
          traceId: getActiveTraceContext()?.traceId ?? null,
        });

        return NextResponse.json({ ok: true, role });
      },
    }),
  );
}
