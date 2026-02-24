import "server-only";

import { prisma } from "@db";
import { getDefaultOrgIdForUser } from "@/server/auth/require-org";
import { requireUser } from "@/server/auth/require-user";
import { Dashboard } from "@/features/dashboard";

export default async function DashboardHomePage() {
  const sessionUser = await requireUser();
  const orgId = await getDefaultOrgIdForUser();

  const user = await prisma.user.findUnique({ where: { id: sessionUser.userId } });
  const org = orgId ? await prisma.organization.findUnique({ where: { id: orgId } }) : null;
  const sub = orgId ? await prisma.subscription.findUnique({ where: { organizationId: orgId } }) : null;

  const teamSize = orgId
    ? await prisma.membership.count({ where: { organizationId: orgId } })
    : 0;

  return (
    <Dashboard />
  );
}
