import { NextResponse } from "next/server";
import { prisma } from "@db";
import { OrgCoreError } from "@org-core";
import { requireUser } from "@/server/auth/require-user";
import { getDefaultOrgIdForUser } from "@/server/auth/require-org";
import { orgErrorResponse } from "@/server/auth/org-error-response";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";
import { createInviteService } from "@/server/adapters/core/org-core.adapter";
import { logOrgAudit } from "@/server/services/org-audit.service";

type Body = { email: string; role: "admin" | "member" };

export async function POST(req: Request) {
  const user = await requireUser();
  const body = (await req.json()) as Body;

  const orgId = await getDefaultOrgIdForUser();
  if (!orgId)
    return NextResponse.json({ ok: false, error: "No org" }, { status: 400 });

  const email = body?.email?.trim();
  const role = body?.role;

  if (!email || (role !== "admin" && role !== "member")) {
    return NextResponse.json(
      { ok: false, error: "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const invites = createInviteService();
    const issued = await invites.createInvite({
      organizationId: orgId,
      inviterUserId: user.userId,
      email,
      role,
      ttlMinutes: 60 * 24 * 3,
    });

    const acceptUrl = absoluteUrl(
      `/api/org/invite/accept?token=${encodeURIComponent(issued.token)}`,
    );
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    const mail = getEmailService();
    await mail.sendOrgInvite(email, acceptUrl, organization?.name ?? undefined);

    await logOrgAudit({
      organizationId: orgId,
      actorUserId: user.userId,
      action: "org.invite.created",
      targetType: "email",
      targetId: email.toLowerCase(),
      metadata: { role },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    await logOrgAudit({
      organizationId: orgId,
      actorUserId: user.userId,
      action: "org.invite.created",
      targetType: "email",
      targetId: email.toLowerCase(),
      outcome: error instanceof OrgCoreError && error.code === "forbidden" ? "forbidden" : "error",
      metadata: { role },
    });
    return orgErrorResponse(error);
  }
}
