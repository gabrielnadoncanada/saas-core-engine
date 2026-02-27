"use server";

import { prisma } from "@db";

import { createVerifyEmailFlow } from "@/server/adapters/core/auth-core.adapter";
import { enforceAuthRateLimit } from "@/server/auth/auth-rate-limit";
import { authErrorMessage } from "@/server/auth/auth-error-message";
import { requireUser } from "@/server/auth/require-user";
import { buildActionRequest } from "@/server/http/build-server-action-request";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";
import { routes } from "@/shared/constants/routes";

import type { ProfileEmailFormState } from "../model/profile-email-form-state";

const REQUEST_PATH = routes.app.settingsProfile;
const VERIFY_EMAIL_RATE_LIMIT_KEY = "verify_email_request" as const;
const VERIFY_EMAIL_CONFIRM_PATH = "/api/auth/verify-email/confirm";
const RESEND_FAILED_MESSAGE = "Failed to resend confirmation email.";

export async function resendProfileEmailConfirmationAction(
  _prevState: ProfileEmailFormState,
): Promise<ProfileEmailFormState> {
  try {
    const req = await buildActionRequest(REQUEST_PATH);
    await enforceAuthRateLimit(req, VERIFY_EMAIL_RATE_LIMIT_KEY);

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
        error: "No pending email change request found.",
        success: null,
        email: user.email,
        pendingEmail: null,
      };
    }

    const conflict = await prisma.user.findFirst({
      where: {
        id: { not: sessionUser.userId },
        deletedAt: null,
        OR: [{ email: user.pendingEmail }, { pendingEmail: user.pendingEmail }],
      },
      select: { id: true },
    });

    if (conflict) {
      return {
        error: "Pending email is no longer available. Choose another email.",
        success: null,
        email: user.email,
        pendingEmail: user.pendingEmail,
      };
    }

    const verifyEmail = createVerifyEmailFlow();
    const issued = await verifyEmail.request({
      userId: sessionUser.userId,
      email: user.pendingEmail,
      ttlMinutes: 60,
    });

    const params = new URLSearchParams({ token: issued.token });
    const confirmUrl = absoluteUrl(`${VERIFY_EMAIL_CONFIRM_PATH}?${params.toString()}`);
    await getEmailService().sendVerifyEmail(user.pendingEmail, confirmUrl);

    return {
      error: null,
      success: "Confirmation email sent again.",
      email: user.email,
      pendingEmail: user.pendingEmail,
      fieldErrors: {},
    };
  } catch (error) {
    return {
      error: authErrorMessage(error, RESEND_FAILED_MESSAGE),
      success: null,
    };
  }
}
