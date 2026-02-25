import { LoginForm } from "@/features/auth";
import { env } from "@/server/config/env";
import { AuthCard } from "@/shared/components/auth/auth-card";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { routes } from "@/shared/constants/routes";
import Link from "next/link";

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
    <Card className='gap-4'>
      <CardHeader>
        <CardTitle className='text-lg tracking-tight'>Sign in</CardTitle>
        <CardDescription>
          Enter your details below to
          log into your account.<br />
          Don't have an account?{' '}
          <Link
            href={signupHref}
            className='underline underline-offset-4 hover:text-primary'
          >
            Sign up
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <LoginForm demoMode={env.DEMO_MODE} />
      </CardContent>
      <CardFooter>
        <p className='px-8 text-center text-sm text-muted-foreground'>
          By clicking sign in, you agree to our{' '}
          <a
            href='/terms'
            className='underline underline-offset-4 hover:text-primary'
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            href='/privacy'
            className='underline underline-offset-4 hover:text-primary'
          >
            Privacy Policy
          </a>
          .
        </p>
      </CardFooter>
    </Card>
  );
}
