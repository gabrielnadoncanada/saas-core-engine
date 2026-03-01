"use server";

import { Prisma, prisma } from "@db";

import { createVerifyEmailFlow } from "@/server/adapters/core/auth-core.adapter";
import { enforceAuthRateLimit } from "@/server/auth/auth-rate-limit";
import { authErrorMessage } from "@/server/auth/auth-error-message";
import { requireUser } from "@/server/auth/require-user";
import { buildActionRequest } from "@/server/http/build-server-action-request";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";
import { routes } from "@/shared/constants/routes";

import type { ProfileEmailFormState } from "../model/profile-email-form-state";
import { profileEmailSchema } from "../model/profile-email.schema";

const REQUEST_PATH = routes.app.settingsProfile;
const VERIFY_EMAIL_RATE_LIMIT_KEY = "verify_email_request" as const;
const VERIFY_EMAIL_CONFIRM_PATH = "/api/auth/verify-email/confirm";
const UPDATE_EMAIL_FAILED_MESSAGE = "Failed to request email change.";
const UPDATE_EMAIL_SUCCESS_MESSAGE = "Verification email sent to your new address.";

export async function updateProfileEmailAction(
  _prevState: ProfileEmailFormState,
  formData: FormData,
): Promise<ProfileEmailFormState> {
  const validated = profileEmailSchema.safeParse({
    email: String(formData.get("email") ?? ""),
  });

  if (!validated.success) {
    const flattened = validated.error.flatten();
    return {
      error: validated.error.errors[0]?.message ?? "Invalid input.",
      success: null,
      fieldErrors: flattened.fieldErrors,
      email: String(formData.get("email") ?? ""),
    };
  }

  try {
    const req = await buildActionRequest(REQUEST_PATH);
    await enforceAuthRateLimit(req, VERIFY_EMAIL_RATE_LIMIT_KEY, {
      identifier: validated.data.email,
    });

    const sessionUser = await requireUser();
    const nextEmail = validated.data.email.toLowerCase();

    const current = await prisma.user.findFirst({
      where: { id: sessionUser.userId, deletedAt: null },
      select: { email: true, pendingEmail: true },
    });

    if (!current) {
      return { error: "Unauthorized.", success: null, email: nextEmail };
    }

    if (current.email === nextEmail) {
      return {
        error: null,
        success: "This is already your current email.",
        fieldErrors: {},
        email: current.email,
        pendingEmail: current.pendingEmail ?? null,
      };
    }

    const conflict = await prisma.user.findFirst({
      where: {
        id: { not: sessionUser.userId },
        deletedAt: null,
        OR: [{ email: nextEmail }, { pendingEmail: nextEmail }],
      },
      select: { id: true },
    });

    if (conflict) {
      return {
        error: "This email is already in use.",
        success: null,
        fieldErrors: { email: ["This email is already in use."] },
        email: nextEmail,
        pendingEmail: current.pendingEmail ?? null,
      };
    }

    await prisma.user.update({
      where: { id: sessionUser.userId },
      data: {
        pendingEmail: nextEmail,
        pendingEmailRequestedAt: new Date(),
      },
    });

    const verifyEmail = createVerifyEmailFlow();
    const issued = await verifyEmail.request({
      userId: sessionUser.userId,
      email: nextEmail,
      ttlMinutes: 60,
    });

    const params = new URLSearchParams({ token: issued.token });
    const confirmUrl = absoluteUrl(`${VERIFY_EMAIL_CONFIRM_PATH}?${params.toString()}`);
    await getEmailService().sendVerifyEmail(nextEmail, confirmUrl);

    return {
      error: null,
      success: UPDATE_EMAIL_SUCCESS_MESSAGE,
      fieldErrors: {},
      email: current.email,
      pendingEmail: nextEmail,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        error: "This email is already in use.",
        success: null,
        fieldErrors: { email: ["This email is already in use."] },
        email: String(formData.get("email") ?? ""),
      };
    }

    return {
      error: authErrorMessage(error, UPDATE_EMAIL_FAILED_MESSAGE),
      success: null,
      email: String(formData.get("email") ?? ""),
    };
  }
}
