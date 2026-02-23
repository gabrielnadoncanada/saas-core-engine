import "server-only";

import { prisma } from "@db";
import { redirect } from "next/navigation";

import { requireUser } from "@/server/auth/require-user";
import { routes } from "@/shared/constants/routes";
import { AppShell } from "@/shared/components/layout/app-shell";

export default async function DashboardLayout(props: { children: React.ReactNode }) {
  const session = await requireUser({ redirect: true });
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { emailVerifiedAt: true },
  });

  if (!user?.emailVerifiedAt) {
    redirect(routes.auth.verifyEmail);
  }

  return <AppShell title="Dashboard">{props.children}</AppShell>;
}
