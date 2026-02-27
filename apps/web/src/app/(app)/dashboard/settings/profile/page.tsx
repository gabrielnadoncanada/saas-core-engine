import { ContentSection } from "@/features/settings/shared/ui/ContentSection";
import { getProfileFormData, ProfileEmailForm, ProfileForm } from "@/features/settings/profile";

type ProfilePageProps = {
  searchParams?: Promise<{
    email_change?: string | string[];
  }>;
};

function readSingle(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const initialData = await getProfileFormData();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const emailChangeStatus = readSingle(resolvedSearchParams?.email_change);

  return (
    <ContentSection
      title='Profile'
      desc='This is how others will see you on the site.'
    >
      <div className='grid gap-4'>
        <ProfileForm initialData={initialData} />
        <ProfileEmailForm
          currentEmail={initialData.email}
          pendingEmail={initialData.pendingEmail}
          emailVerified={Boolean(initialData.emailVerifiedAt)}
          emailChangeStatus={emailChangeStatus}
        />
      </div>
    </ContentSection>
  );
}
