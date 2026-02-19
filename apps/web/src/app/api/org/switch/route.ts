import { orgSwitchBodySchema } from "@contracts";
import { OrgCoreError } from "@org-core";
import { NextResponse } from "next/server";

import { createOrgService } from "@/server/adapters/core/org-core.adapter";
import { orgErrorResponse } from "@/server/auth/org-error-response";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
import { logOrgAudit } from "@/server/services/org-audit.service";
import { withApiTelemetry } from "@/server/telemetry/otel";

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/org/switch", async () => {
    const parsed = orgSwitchBodySchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid input" },
        { status: 400 },
      );
    }

    const { organizationId } = parsed.data;

    try {
      return await withRequiredOrgScope({
        organizationId,
        action: "org:switch",
        run: async (orgCtx) => {
          const orgs = createOrgService();
          const switched = await orgs.switchActiveOrganization({
            userId: orgCtx.userId,
            organizationId: orgCtx.organizationId,
          });

          await logOrgAudit({
            organizationId: orgCtx.organizationId,
            actorUserId: orgCtx.userId,
            action: "org.switched",
            metadata: orgCtx.impersonation
              ? {
                  impersonation: {
                    actorUserId: orgCtx.impersonation.actorUserId,
                    targetUserId: orgCtx.impersonation.targetUserId,
                  },
                }
              : {},
          });

          return NextResponse.json({ ok: true, organizationId: switched.organizationId });
        },
      });
    } catch (error) {
      if (error instanceof OrgCoreError) {
        await logOrgAudit({
          organizationId,
          actorUserId: null,
          action: "org.switched",
          outcome: error.code === "forbidden" ? "forbidden" : "error",
          metadata: {},
        });
      }
      return orgErrorResponse(error);
    }
  });
}
