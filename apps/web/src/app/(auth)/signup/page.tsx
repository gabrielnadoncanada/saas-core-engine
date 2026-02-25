import { SignupForm } from "@/features/auth";
import { AuthCard } from "@/shared/components/auth/auth-card";
import { routes } from "@/shared/constants/routes";

export default async function SignupPage(props: {
  searchParams?: Promise<{ redirect?: string | string[] }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const redirectParam = Array.isArray(searchParams?.redirect)
    ? searchParams?.redirect[0]
    : searchParams?.redirect;
  const loginHref = redirectParam
    ? `${routes.auth.login}?redirect=${encodeURIComponent(redirectParam)}`
    : routes.auth.login;

  return (
    <AuthCard
      title="Create your account"
      subtitle="Create a workspace and start building."
      footer={<Footer loginHref={loginHref} />}
    >
      <SignupForm />
    </AuthCard>
  );
}

function Footer(props: { loginHref: string }) {
  return (
    <div className="text-sm text-muted-foreground">
      Already have an account?{" "}
      <a className="underline" href={props.loginHref}>
        Sign in
      </a>
    </div>
  );
}
