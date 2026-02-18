import { NextResponse } from "next/server";
import { OrgCoreError } from "@org-core";
import { requireUser } from "@/server/auth/require-user";
import { createOrgService } from "@/server/adapters/core/org-core.adapter";
import { logOrgAudit } from "@/server/services/org-audit.service";
import { orgErrorResponse } from "@/server/auth/org-error-response";

type Body = { name: string };

export async function POST(req: Request) {
  const user = await requireUser();
  const body = (await req.json()) as Body;

  if (!body?.name)
    return NextResponse.json(
      { ok: false, error: "Invalid input" },
      { status: 400 },
    );

  try {
    const orgs = createOrgService();
    const res = await orgs.createOrg({
      ownerUserId: user.userId,
      name: body.name,
    });

    await logOrgAudit({
      organizationId: res.organizationId,
      actorUserId: user.userId,
      action: "org.created",
      metadata: { name: body.name },
    });

    return NextResponse.json({ ok: true, organizationId: res.organizationId });
  } catch (error) {
    if (error instanceof OrgCoreError) {
      return orgErrorResponse(error);
    }
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
