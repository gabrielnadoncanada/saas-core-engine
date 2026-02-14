import { AuthCard } from "@/shared/ui/auth/auth-card";
import { SignupForm } from "@/features/auth/ui/signup-form";

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Create a workspace and start building."
      footer={<Footer />}
    >
      <SignupForm />
    </AuthCard>
  );
}

function Footer() {
  return (
    <div className="text-sm text-muted-foreground">
      Already have an account?{" "}
      <a className="underline" href="/login">
        Sign in
      </a>
    </div>
  );
}
