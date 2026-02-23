import { prisma } from "@db";
import { redirect } from "next/navigation";

import { VerifyEmailGate } from "@/features/auth/ui";
import { requireUser } from "@/server/auth/require-user";
import { AuthCard } from "@/shared/components/auth/auth-card";
import { routes } from "@/shared/constants/routes";

export default async function VerifyEmailPage() {
  const session = await requireUser({ redirect: true });
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, emailVerifiedAt: true },
  });

  if (!user) {
    redirect(routes.auth.login);
  }

  if (user.emailVerifiedAt) {
    redirect(routes.app.dashboard);
  }

  return (
    <AuthCard
      title="Verify your email"
      subtitle="You need to verify your email before accessing the dashboard."
    >
      <VerifyEmailGate email={user.email} />
    </AuthCard>
  );
}
