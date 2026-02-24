import "server-only";

import { prisma } from "@db";

import { ProfileEmailForm, ProfileForm, SecurityActions, SignInMethods } from "@/features/settings/ui";
import { requireUser } from "@/server/auth/require-user";
import { enabledOAuthProviders } from "@/server/auth/sign-in-methods";
import { env } from "@/server/config/env";

type PageProps = {
  searchParams?: Promise<{
    signin_error?: string | string[];
    signin_success?: string | string[];
  }>;
};

export default async function SettingsPage(props: PageProps) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const signinError = Array.isArray(searchParams?.signin_error)
    ? searchParams?.signin_error[0]
    : searchParams?.signin_error;
  const signinSuccess = Array.isArray(searchParams?.signin_success)
    ? searchParams?.signin_success[0]
    : searchParams?.signin_success;

  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.userId },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      phoneNumber: true,
      emailVerifiedAt: true,
      passwordHash: true,
      oauthAccounts: {
        select: {
          provider: true,
          email: true,
          providerAccountId: true,
          lastUsedAt: true,
        },
      },
    },
  });

  const connectedCount =
    (user?.passwordHash ? 1 : 0) + (user?.oauthAccounts.length ?? 0);

  const initialMethods = [
    ...(env.AUTH_SIGNIN_EMAIL_ENABLED
      ? [
          {
            provider: "email" as const,
            label: "Email",
            connected: Boolean(user?.passwordHash),
            linkedIdentifier: user?.email ?? undefined,
            action: "manage" as const,
            canDisconnect: connectedCount > 1,
          },
        ]
      : []),
    ...enabledOAuthProviders().map((provider) => {
      const account = user?.oauthAccounts.find((row) => row.provider === provider);
      return {
        provider,
        label: provider === "google" ? "Google" : "GitHub",
        connected: Boolean(account),
        linkedIdentifier:
          account?.email ??
          (account ? `${provider}:${account.providerAccountId}` : undefined),
        lastUsedAt: account?.lastUsedAt?.toISOString(),
        action: account ? ("disconnect" as const) : ("connect" as const),
        canDisconnect: account ? connectedCount > 1 : false,
      };
    }),
  ];

  return (
    <div style={{ padding: 24, maxWidth: 980 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Settings</h1>

      <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
        <section style={card}>
          <h2 style={h2}>Profile</h2>
          <ProfileForm
            initialFirstName={user?.firstName ?? null}
            initialLastName={user?.lastName ?? null}
            initialAvatarUrl={user?.avatarUrl ?? null}
            initialPhoneNumber={user?.phoneNumber ?? null}
            accountEmail={user?.email ?? ""}
          />
          <ProfileEmailForm
            currentEmail={user?.email ?? ""}
            emailVerified={Boolean(user?.emailVerifiedAt)}
          />
        </section>

        <section style={card}>
          <h2 style={h2}>Sign-in methods</h2>
          <p style={{ marginTop: 8, color: "#666" }}>
            Manage the ways you can sign in to this account.
          </p>
          <SignInMethods
            initialMethods={initialMethods}
            flashError={signinError}
            flashSuccess={signinSuccess}
          />
        </section>

        <section style={card}>
          <h2 style={h2}>Security</h2>
          <p style={{ marginTop: 8, color: "#666" }}>
            Reset your password or revoke your sessions.
          </p>

          <div style={{ marginTop: 12 }}>
            <SecurityActions userEmail={user?.email ?? ""} />
          </div>
        </section>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 16,
};

const h2: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
};
