import { prisma } from "@db";
import { redirect } from "next/navigation";

import { AuthCard, VerifyEmailGate } from "@/features/auth";
import { requireUser } from "@/server/auth/require-user";
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
      description="You need to verify your email before accessing the dashboard."
      footer={(
        <p className="mx-auto px-8 text-center text-sm text-balance text-muted-foreground">
          If you do not receive the email, check your spam folder and try again.
        </p>
      )}
    >
      <VerifyEmailGate email={user.email} />
    </AuthCard>
  );
}
