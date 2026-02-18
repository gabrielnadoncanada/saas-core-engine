import { NextResponse } from "next/server";
import { orgCreateBodySchema } from "@contracts";
import { OrgCoreError } from "@org-core";
import { requireUser } from "@/server/auth/require-user";
import { createOrgService } from "@/server/adapters/core/org-core.adapter";
import { logOrgAudit } from "@/server/services/org-audit.service";
import { orgErrorResponse } from "@/server/auth/org-error-response";
import { withApiTelemetry } from "@/server/telemetry/otel";

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/org/create", async () => {
    const user = await requireUser();
    const parsed = orgCreateBodySchema.safeParse(await req.json());

    if (!parsed.success)
      return NextResponse.json(
        { ok: false, error: "Invalid input" },
        { status: 400 },
      );

    const { name } = parsed.data;

    try {
      const orgs = createOrgService();
      const res = await orgs.createOrg({
        ownerUserId: user.userId,
        name,
      });

      await logOrgAudit({
        organizationId: res.organizationId,
        actorUserId: user.userId,
        action: "org.created",
        metadata: { name },
      });

      return NextResponse.json({ ok: true, organizationId: res.organizationId });
    } catch (error) {
      if (error instanceof OrgCoreError) {
        return orgErrorResponse(error);
      }
      return NextResponse.json(
        { ok: false, error: "internal_error" },
        { status: 500 },
      );
    }
  });
}
