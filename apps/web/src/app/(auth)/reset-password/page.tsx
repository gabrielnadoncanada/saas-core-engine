import { ResetPasswordForm } from "@/features/auth/ui/reset-password-form";
import { AuthCard } from "@/shared/components/auth/auth-card";

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Choose a new password"
      subtitle="Set a new password for your account."
      footer={<a className="text-sm underline text-muted-foreground" href="/login">Back to login</a>}
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
