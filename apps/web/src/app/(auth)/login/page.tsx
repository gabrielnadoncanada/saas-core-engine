import { LoginForm } from "@/features/auth/ui";
import { env } from "@/server/config/env";
import { AuthCard } from "@/shared/components/auth/auth-card";
import { routes } from "@/shared/constants/routes";

export default function LoginPage(props: {
  searchParams?: { redirect?: string | string[] };
}) {
  const redirectParam = Array.isArray(props.searchParams?.redirect)
    ? props.searchParams?.redirect[0]
    : props.searchParams?.redirect;
  const signupHref = redirectParam
    ? `${routes.auth.signup}?redirect=${encodeURIComponent(redirectParam)}`
    : routes.auth.signup;

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in with email/password, Google, GitHub, or a magic link."
      footer={<LoginFormFooter signupHref={signupHref} />}
    >
      <LoginForm demoMode={env.DEMO_MODE} />
    </AuthCard>
  );
}

function LoginFormFooter(props: { signupHref: string }) {
  return (
    <div className="text-sm text-muted-foreground">
      No account?{" "}
      <a className="underline" href={props.signupHref}>
        Create one
      </a>
    </div>
  );
}
