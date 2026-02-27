import { DisplaySettingsPanel } from "@/features/settings/display";
import { ContentSection } from "@/features/settings/shared/ui/ContentSection";

export default function DisplayPage() {
  return (
    <ContentSection
      title="Display"
      desc="Customize theme, sidebar, and layout preferences."
    >
      <DisplaySettingsPanel />
    </ContentSection>
  );
}
