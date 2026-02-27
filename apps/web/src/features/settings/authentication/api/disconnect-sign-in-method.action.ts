"use server";

import { prisma } from "@db";
import type { OAuthProvider } from "@contracts";

import { authErrorMessage } from "@/server/auth/auth-error-message";
import { enabledOAuthProviders } from "@/server/auth/sign-in-methods";
import { requireUser } from "@/server/auth/require-user";
import type { ActionResult } from "@/shared/types";
import { fail, ok } from "@/shared/types";
import { getCurrentSignInMethods } from "./get-current-sign-in-methods.query";
import type { SignInMethod } from "../model/sign-in-methods.types";

export async function disconnectSignInMethodAction(
  provider: OAuthProvider,
): Promise<ActionResult<SignInMethod[]>> {
  try {
    if (!enabledOAuthProviders().includes(provider)) {
      return fail("Invalid provider.");
    }

    const sessionUser = await requireUser();
    const user = await prisma.user.findFirst({
      where: { id: sessionUser.userId, deletedAt: null },
      select: {
        passwordHash: true,
        oauthAccounts: {
          select: {
            provider: true,
          },
        },
      },
    });

    if (!user) {
      return fail("Unauthorized.");
    }

    const connectedCount = (user.passwordHash ? 1 : 0) + user.oauthAccounts.length;
    const currentlyConnected = user.oauthAccounts.some((account) => account.provider === provider);
    if (!currentlyConnected) {
      return fail("Provider is not connected.");
    }
    if (connectedCount <= 1) {
      return fail("You must add another sign-in method first.");
    }

    await prisma.oAuthAccount.deleteMany({
      where: {
        userId: sessionUser.userId,
        provider,
      },
    });

    const methods = await getCurrentSignInMethods();
    return ok(methods);
  } catch (error) {
    return fail(authErrorMessage(error, "Failed to disconnect provider."));
  }
}
