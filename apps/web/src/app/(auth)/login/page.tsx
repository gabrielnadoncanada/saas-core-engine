import { LoginForm } from "@/features/auth/ui";
import { env } from "@/server/config/env";
import { AuthCard } from "@/shared/components/auth/auth-card";
import { routes } from "@/shared/constants/routes";

export default async function LoginPage(props: {
  searchParams?: Promise<{ redirect?: string | string[] }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const redirectParam = Array.isArray(searchParams?.redirect)
    ? searchParams?.redirect[0]
    : searchParams?.redirect;
  const signupHref = redirectParam
    ? `${routes.auth.signup}?redirect=${encodeURIComponent(redirectParam)}`
    : routes.auth.signup;

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in with email/password, Google, or GitHub."
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
