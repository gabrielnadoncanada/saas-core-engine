import { SignupForm } from "@/features/auth";
import { AuthCard } from "@/shared/components/auth/auth-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/shared/components/ui/card";
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
    <Card className='gap-4'>
      <CardHeader>
        <CardTitle className='text-lg tracking-tight'>
          Create an account
        </CardTitle>
        <CardDescription>
          Enter your email and password to create an account. <br />
          Already have an account?{' '}
          <Link
            href={loginHref}
            className='underline underline-offset-4 hover:text-primary'
          >
            Sign In
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
      <CardFooter>
        <p className='px-8 text-center text-sm text-muted-foreground'>
          By creating an account, you agree to our{' '}
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

