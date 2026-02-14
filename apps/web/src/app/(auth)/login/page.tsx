import { AuthCard } from "@/shared/ui/auth/auth-card";
import { LoginForm } from "@/features/auth/ui/login-form";

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in with email/password, Google, or a magic link."
      footer={<LoginFormFooter />}
    >
      <LoginForm />
    </AuthCard>
  );
}

function LoginFormFooter() {
  return (
    <div className="text-sm text-muted-foreground">
      No account?{" "}
      <a className="underline" href="/signup">
        Create one
      </a>
    </div>
  );
}
