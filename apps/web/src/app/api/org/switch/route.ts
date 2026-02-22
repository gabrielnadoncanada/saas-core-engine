import { orgSwitchBodySchema } from "@contracts";
import { NextResponse } from "next/server";

import { createOrgService } from "@/server/adapters/core/org-core.adapter";
import { orgErrorResponse } from "@/server/auth/org-error-response";
import { withRequiredOrgScope } from "@/server/auth/with-org-scope";
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

          return NextResponse.json({ ok: true, organizationId: switched.organizationId });
        },
      });
    } catch (error) {
      return orgErrorResponse(error);
    }
  });
}

