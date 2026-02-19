import { ForgotPasswordForm } from "@/features/auth/ui/forgot-password-form";
import { AuthCard } from "@/shared/ui/auth/auth-card";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      subtitle="We’ll email you a reset link."
      footer={<a className="text-sm underline text-muted-foreground" href="/login">Back to login</a>}
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
