import "server-only";

import { prisma } from "@db";

import { requireUser } from "@/server/auth/require-user";
import { buildSignInMethods, type SignInMethod } from "@/server/auth/sign-in-methods";

export type SettingsSearchParams = {
  signin_error?: string | string[];
  signin_success?: string | string[];
};

export type { SignInMethod as SignInMethodItem };

export type SettingsPageData = {
  user: {
    email: string;
    pendingEmail: string | null;
    pendingEmailRequestedAt: Date | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    phoneNumber: string | null;
    emailVerifiedAt: Date | null;
  };
  initialMethods: SignInMethod[];
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
      pendingEmail: true,
      pendingEmailRequestedAt: true,
      username: true,
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

  const initialMethods = user
    ? buildSignInMethods(user)
    : [];

  return {
    user: {
      email,
      pendingEmail: user?.pendingEmail ?? null,
      pendingEmailRequestedAt: user?.pendingEmailRequestedAt ?? null,
      username: user?.username ?? null,
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
