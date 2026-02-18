import { NextResponse } from "next/server";
import { prisma } from "@db";
import { requireUser } from "@/server/auth/require-user";
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

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.userId,
        organizationId,
      },
    },
    select: { id: true },
  });

  if (!membership) {
    await logOrgAudit({
      organizationId,
      actorUserId: user.userId,
      action: "org.switched",
      outcome: "forbidden",
      metadata: {},
    });
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: user.userId },
    data: { activeOrganizationId: organizationId },
  });

  await logOrgAudit({
    organizationId,
    actorUserId: user.userId,
    action: "org.switched",
    metadata: {},
  });

  return NextResponse.json({ ok: true, organizationId });
}
