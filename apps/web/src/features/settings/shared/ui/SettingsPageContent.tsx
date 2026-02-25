import "server-only";

import { ProfileEmailForm } from "../../ui/profile-email-form";
import { ProfileForm } from "../../ui/profile-form";
import { SecurityActions } from "../../ui/security-actions";
import { SignInMethods } from "../../ui/sign-in-methods";
import { getSettingsPageData, type SettingsSearchParams } from "../../model/get-settings-page-data.query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

type SettingsPageContentProps = {
  searchParams?: Promise<SettingsSearchParams>;
};

export async function SettingsPageContent({ searchParams }: SettingsPageContentProps) {
  const data = await getSettingsPageData(searchParams);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfileForm
              initialFirstName={data.user.firstName}
              initialLastName={data.user.lastName}
              initialAvatarUrl={data.user.avatarUrl}
              initialPhoneNumber={data.user.phoneNumber}
              accountEmail={data.user.email}
            />
            <ProfileEmailForm
              currentEmail={data.user.email}
              emailVerified={Boolean(data.user.emailVerifiedAt)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sign-in methods</CardTitle>
            <CardDescription>Manage the ways you can sign in to this account.</CardDescription>
          </CardHeader>
          <CardContent>
            <SignInMethods
              initialMethods={data.initialMethods}
              flashError={data.flash.signinError}
              flashSuccess={data.flash.signinSuccess}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Reset your password or revoke your sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <SecurityActions userEmail={data.user.email} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
