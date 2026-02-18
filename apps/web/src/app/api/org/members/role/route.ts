import { NextResponse } from "next/server";
import { OrgCoreError } from "@org-core";
import { requireUser } from "@/server/auth/require-user";
import { getDefaultOrgIdForUser } from "@/server/auth/require-org";
import { orgErrorResponse } from "@/server/auth/org-error-response";
import { createMembershipService } from "@/server/adapters/core/org-core.adapter";
import { logOrgAudit } from "@/server/services/org-audit.service";

type Body = { membershipId: string; role: "admin" | "member" };

export async function POST(req: Request) {
  const user = await requireUser();
  const orgId = await getDefaultOrgIdForUser();
  if (!orgId) {
    return NextResponse.json({ ok: false, error: "No org" }, { status: 400 });
  }

  const body = (await req.json()) as Body;
  const membershipId = body?.membershipId?.trim();
  const role = body?.role;

  if (!membershipId || (role !== "admin" && role !== "member")) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  try {
    const memberships = createMembershipService();
    await memberships.changeMemberRole({
      actorUserId: user.userId,
      organizationId: orgId,
      membershipId,
      role,
    });

    await logOrgAudit({
      organizationId: orgId,
      actorUserId: user.userId,
      action: "org.member.role_changed",
      targetType: "membership",
      targetId: membershipId,
      metadata: { role },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    await logOrgAudit({
      organizationId: orgId,
      actorUserId: user.userId,
      action: "org.member.role_changed",
      targetType: "membership",
      targetId: membershipId,
      outcome: error instanceof OrgCoreError && error.code === "forbidden" ? "forbidden" : "error",
      metadata: { role },
    });
    return orgErrorResponse(error);
  }
}
