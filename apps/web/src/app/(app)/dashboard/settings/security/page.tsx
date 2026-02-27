import { ChangePasswordForm } from "@/features/settings/security";
import { ContentSection } from "@/features/settings/shared/ui/ContentSection";

export default function SecurityPage() {
  return (
    <ContentSection
      title="Security"
      desc="Update your account password."
    >
      <ChangePasswordForm />
    </ContentSection>
  );
}
