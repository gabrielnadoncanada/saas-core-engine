import "server-only";

import { prisma } from "@db";

import { requireUser } from "@/server/auth/require-user";
import { enabledOAuthProviders } from "@/server/auth/sign-in-methods";
import { env } from "@/server/config/env";

export type SettingsSearchParams = {
  signin_error?: string | string[];
  signin_success?: string | string[];
};

export type SignInMethodItem = {
  provider: "email" | "google" | "github";
  label: string;
  connected: boolean;
  linkedIdentifier?: string;
  lastUsedAt?: string;
  action: "connect" | "manage" | "disconnect";
  canDisconnect: boolean;
};

export type SettingsPageData = {
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    phoneNumber: string | null;
    emailVerifiedAt: Date | null;
  };
  initialMethods: SignInMethodItem[];
  flash: {
    signinError?: string;
    signinSuccess?: string;
  };
};

function readSingle(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function getSettingsPageData(
  searchParams?: Promise<SettingsSearchParams>,
): Promise<SettingsPageData> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const signinError = readSingle(resolvedSearchParams?.signin_error);
  const signinSuccess = readSingle(resolvedSearchParams?.signin_success);

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

  const email = user?.email ?? "";
  const connectedCount = (user?.passwordHash ? 1 : 0) + (user?.oauthAccounts.length ?? 0);

  const initialMethods: SignInMethodItem[] = [
    ...(env.AUTH_SIGNIN_EMAIL_ENABLED
      ? [
          {
            provider: "email" as const,
            label: "Email",
            connected: Boolean(user?.passwordHash),
            linkedIdentifier: email || undefined,
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
          account?.email ?? (account ? `${provider}:${account.providerAccountId}` : undefined),
        lastUsedAt: account?.lastUsedAt?.toISOString(),
        action: account ? ("disconnect" as const) : ("connect" as const),
        canDisconnect: account ? connectedCount > 1 : false,
      };
    }),
  ];

  return {
    user: {
      email,
      firstName: user?.firstName ?? null,
      lastName: user?.lastName ?? null,
      avatarUrl: user?.avatarUrl ?? null,
      phoneNumber: user?.phoneNumber ?? null,
      emailVerifiedAt: user?.emailVerifiedAt ?? null,
    },
    initialMethods,
    flash: {
      signinError,
      signinSuccess,
    },
  };
}
