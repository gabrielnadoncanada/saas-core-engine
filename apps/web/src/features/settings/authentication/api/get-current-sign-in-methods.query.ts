import "server-only";

import { prisma } from "@db";

import { requireUser } from "@/server/auth/require-user";
import { buildSignInMethods } from "@/server/auth/sign-in-methods";
import type { SignInMethod } from "../model/sign-in-methods.types";

export async function getCurrentSignInMethods(): Promise<SignInMethod[]> {
  const sessionUser = await requireUser();
  const user = await prisma.user.findFirst({
    where: { id: sessionUser.userId, deletedAt: null },
    select: {
      email: true,
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

  if (!user) {
    return [];
  }

  return buildSignInMethods(user);
}
