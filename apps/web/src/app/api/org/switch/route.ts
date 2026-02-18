import { NextResponse } from "next/server";
import { OrgCoreError } from "@org-core";
import { requireUser } from "@/server/auth/require-user";
import { createOrgService } from "@/server/adapters/core/org-core.adapter";
import { orgErrorResponse } from "@/server/auth/org-error-response";
import { logOrgAudit } from "@/server/services/org-audit.service";

type Body = { organizationId: string };

export async function POST(req: Request) {
  const user = await requireUser();
  const body = (await req.json()) as Body;
  const organizationId = body?.organizationId?.trim();

  if (!organizationId) {
    return NextResponse.json(
      { ok: false, error: "Invalid input" },
      { status: 400 },
    );
  }

  const orgs = createOrgService();
  try {
    const switched = await orgs.switchActiveOrganization({
      userId: user.userId,
      organizationId,
    });

    await logOrgAudit({
      organizationId,
      actorUserId: user.userId,
      action: "org.switched",
      metadata: {},
    });

    return NextResponse.json({ ok: true, organizationId: switched.organizationId });
  } catch (error) {
    await logOrgAudit({
      organizationId,
      actorUserId: user.userId,
      action: "org.switched",
      outcome:
        error instanceof OrgCoreError && error.code === "forbidden"
          ? "forbidden"
          : "error",
      metadata: {},
    });
    return orgErrorResponse(error);
  }
}
