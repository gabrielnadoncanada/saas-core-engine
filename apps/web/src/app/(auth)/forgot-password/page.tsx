import { ForgotPasswordForm } from "@/features/auth";
import { AuthCard } from "@/shared/components/auth/auth-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/shared/components/ui/card";
import { routes } from "@/shared/constants/routes";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const loginHref = routes.auth.login;
  return (
    <Card className='gap-4'>
      <CardHeader>
        <CardTitle className='text-lg tracking-tight'>
          Forgot Password
        </CardTitle>
        <CardDescription>
          Enter your registered email and <br /> we will send you a link to
          reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
      <CardFooter>
        <p className='mx-auto px-8 text-center text-sm text-balance text-muted-foreground'>
          Already have an account?{' '}
          <Link
            href={loginHref}
            className='underline underline-offset-4 hover:text-primary'
          >
            Sign in
          </Link>
          .
        </p>
      </CardFooter>
    </Card>
  );
}
