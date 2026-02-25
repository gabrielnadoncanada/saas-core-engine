import { AuthCard, ForgotPasswordForm } from "@/features/auth";
import { routes } from "@/shared/constants/routes";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const loginHref = routes.auth.login;

  return (
    <AuthCard
      title="Forgot password"
      description="Enter your email address and we'll send you a link to reset your password."
      footer={(
        <p className="mx-auto px-8 text-center text-sm text-balance text-muted-foreground">
          Remembered your password?{" "}
          <Link href={loginHref} className="underline underline-offset-4 hover:text-primary">
            Back to sign in
          </Link>
          .
        </p>
      )}
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
