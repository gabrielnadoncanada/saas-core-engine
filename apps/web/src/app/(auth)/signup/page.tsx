import { AuthCard, SignupForm } from "@/features/auth";
import { routes } from "@/shared/constants/routes";
import Link from "next/link";

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
      title="Create an account"
      description={(
        <>
          Enter your email and password to create an account.
          <br />
          Already have an account?{" "}
          <Link href={loginHref} className="underline underline-offset-4 hover:text-primary">
            Sign In
          </Link>
        </>
      )}
      footer={(
        <p className="px-8 text-center text-sm text-muted-foreground">
          By creating an account, you agree to our{" "}
          <a href="/terms" className="underline underline-offset-4 hover:text-primary">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </a>
          .
        </p>
      )}
    >
      <SignupForm />
    </AuthCard>
  );
}
