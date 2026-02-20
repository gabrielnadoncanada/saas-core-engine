import { SignupForm } from "@/features/auth/ui";
import { AuthCard } from "@/shared/components/auth/auth-card";

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
