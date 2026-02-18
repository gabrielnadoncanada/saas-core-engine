import { NextResponse } from "next/server";
import { prisma } from "@db";
import { requireUser } from "@/server/auth/require-user";

export async function GET() {
  const user = await requireUser();

  const memberships = await prisma.membership.findMany({
    where: { userId: user.userId },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    ok: true,
    activeOrganizationId: user.organizationId,
    organizations: memberships.map((membership) => ({
      organizationId: membership.organizationId,
      name: membership.organization.name,
      role: membership.role,
    })),
  });
}
