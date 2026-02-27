import { getSettingsPageData, type SettingsSearchParams } from "@/features/settings/model/get-settings-page-data.query";
import { SignInMethods } from "@/features/settings/authentication";
import { ContentSection } from "@/features/settings/shared/ui/ContentSection";

type AuthenticationPageProps = {
  searchParams?: Promise<SettingsSearchParams>;
};

export default async function AuthenticationPage({ searchParams }: AuthenticationPageProps) {
  const data = await getSettingsPageData(searchParams);

  return (
    <ContentSection
      title='Authentication'
      desc='Manage and link the sign-in methods available for your account.'
    >
      <SignInMethods
        initialMethods={data.initialMethods}
        flashError={data.flash.signinError}
        flashSuccess={data.flash.signinSuccess}
      />
    </ContentSection>
  );
}
