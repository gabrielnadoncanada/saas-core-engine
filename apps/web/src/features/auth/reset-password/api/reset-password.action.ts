"use server";

import { redirect } from "next/navigation";

import { setSessionCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import {
  createPasswordResetFlow,
  createSessionService,
} from "@/server/adapters/core/auth-core.adapter";
import { authErrorMessage } from "@/server/auth/auth-error-message";
import { env } from "@/server/config/env";

import { buildActionRequest } from "@/server/http/build-server-action-request";
import { getDashboardRedirectPath } from "@/features/auth/shared/lib/auth-redirect.guard";
import {
  type ResetPasswordFormState,
} from "@/features/auth/reset-password/model/reset-password.form-state";
import { resetPasswordFormSchema } from "@/features/auth/reset-password/model/reset-password.schema";

const RESET_PASSWORD_ACTION_PATH = "/reset-password";
const MISSING_TOKEN_MESSAGE = "Missing token.";
const INVALID_INPUT_MESSAGE = "Invalid input";
const INVALID_OR_EXPIRED_TOKEN_MESSAGE = "This link is invalid or has expired.";
const RESET_FAILED_MESSAGE = "Reset failed.";

export async function resetPasswordAction(
  _prevState: ResetPasswordFormState,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  const token = String(formData.get("token") ?? "");
  if (!token) {
    return { error: MISSING_TOKEN_MESSAGE };
  }

  const validated = resetPasswordFormSchema.safeParse({
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!validated.success) {
    const flattened = validated.error.flatten();
    return {
      error: validated.error.errors[0]?.message ?? INVALID_INPUT_MESSAGE,
      fieldErrors: flattened.fieldErrors,
    };
  }

  try {
    const flow = createPasswordResetFlow();
    const result = await flow.reset({
      token,
      newPassword: validated.data.password,
    });

    if (!result.ok) {
      return { error: INVALID_OR_EXPIRED_TOKEN_MESSAGE };
    }

    const req = await buildActionRequest(RESET_PASSWORD_ACTION_PATH);
    const sessions = createSessionService();
    const session = await sessions.createSession({
      userId: result.userId,
      ttlDays: env.SESSION_TTL_DAYS,
      userAgent: req.headers.get("user-agent"),
    });
    await setSessionCookie(session);
  } catch (error) {
    return { error: authErrorMessage(error, RESET_FAILED_MESSAGE) };
  }

  redirect(getDashboardRedirectPath());
}
