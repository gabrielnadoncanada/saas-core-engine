import { AuthCard, ResetPasswordForm } from "@/features/auth";
import { routes } from "@/shared/constants/routes";
import Link from "next/link";

export default function ResetPasswordPage() {
  const loginHref = routes.auth.login;

  return (
    <AuthCard
      title="Choose a new password"
      description="Enter a new password for your account below."
      footer={(
        <p className="mx-auto px-8 text-center text-sm text-balance text-muted-foreground">
          <Link href={loginHref} className="underline underline-offset-4 hover:text-primary">
            Back to sign in
          </Link>
          .
        </p>
      )}
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
