"use server";

import { prisma } from "@db";

import { authErrorMessage } from "@/server/auth/auth-error-message";
import { requireUser } from "@/server/auth/require-user";

import type { ProfileEmailFormState } from "../model/profile-email-form-state";

const CANCEL_FAILED_MESSAGE = "Failed to cancel email change request.";

export async function cancelProfileEmailChangeAction(
  _prevState: ProfileEmailFormState,
): Promise<ProfileEmailFormState> {
  try {
    const sessionUser = await requireUser();

    const user = await prisma.user.findFirst({
      where: { id: sessionUser.userId, deletedAt: null },
      select: { email: true, pendingEmail: true },
    });

    if (!user) {
      return { error: "Unauthorized.", success: null };
    }

    if (!user.pendingEmail) {
      return {
        error: null,
        success: "No pending email change request to cancel.",
        email: user.email,
        pendingEmail: null,
      };
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: sessionUser.userId },
        data: {
          pendingEmail: null,
          pendingEmailRequestedAt: null,
        },
      }),
      prisma.emailToken.deleteMany({
        where: {
          userId: sessionUser.userId,
          type: "verify_email",
          email: user.pendingEmail,
          usedAt: null,
        },
      }),
    ]);

    return {
      error: null,
      success: "Email change request canceled.",
      email: user.email,
      pendingEmail: null,
      fieldErrors: {},
    };
  } catch (error) {
    return {
      error: authErrorMessage(error, CANCEL_FAILED_MESSAGE),
      success: null,
    };
  }
}
