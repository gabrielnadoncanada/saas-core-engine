import "server-only";

import { SignInMethods } from "../../authentication";
import { ProfileEmailForm, ProfileForm } from "../../profile";
import { SecurityActions } from "../../ui/security-actions";
import { getSettingsPageData, type SettingsSearchParams } from "../../model/get-settings-page-data.query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

type SettingsPageContentProps = {
  searchParams?: Promise<SettingsSearchParams>;
};

export async function SettingsPageContent({ searchParams }: SettingsPageContentProps) {
  const data = await getSettingsPageData(searchParams);

  return (

    <div className="grid gap-4">

      <ProfileForm
        initialData={{
          email: data.user.email,
          username: data.user.username ?? "",
          firstName: data.user.firstName ?? "",
          lastName: data.user.lastName ?? "",
          avatarUrl: data.user.avatarUrl ?? "",
          phoneNumber: data.user.phoneNumber ?? "",
        }}
      />
      <ProfileEmailForm
        currentEmail={data.user.email}
        pendingEmail={data.user.pendingEmail}
        emailVerified={Boolean(data.user.emailVerifiedAt)}
      />


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
  );
}
