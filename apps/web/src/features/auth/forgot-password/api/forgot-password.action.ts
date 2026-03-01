"use server";

import { createPasswordResetFlow } from "@/server/adapters/core/auth-core.adapter";
import { enforceAuthRateLimit } from "@/server/auth/auth-rate-limit";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";

import { buildActionRequest } from "@/server/http/build-server-action-request";
import type { ForgotPasswordFormState } from "@/features/auth/forgot-password/model/forgot-password.form-state";
import { forgotPasswordFormSchema } from "@/features/auth/forgot-password/model/forgot-password.schema";

const FORGOT_PASSWORD_ACTION_PATH = "/forgot-password";
const FORGOT_PASSWORD_RATE_LIMIT_KEY = "password_forgot" as const;
const PASSWORD_RESET_TTL_MINUTES = 15;
const INVALID_INPUT_MESSAGE = "Invalid input";
const FORGOT_PASSWORD_SUCCESS_MESSAGE = "If the email exists, a reset link was sent.";

export async function forgotPasswordAction(
  _prevState: ForgotPasswordFormState,
  formData: FormData,
): Promise<ForgotPasswordFormState> {
  const validated = forgotPasswordFormSchema.safeParse({
    email: String(formData.get("email") ?? ""),
  });

  if (!validated.success) {
    const flattened = validated.error.flatten();
    return {
      error: validated.error.errors[0]?.message ?? INVALID_INPUT_MESSAGE,
      success: null,
      fieldErrors: flattened.fieldErrors,
    };
  }

  const start = Date.now();

  try {
    const req = await buildActionRequest(FORGOT_PASSWORD_ACTION_PATH);
    await enforceAuthRateLimit(req, FORGOT_PASSWORD_RATE_LIMIT_KEY, {
      identifier: validated.data.email,
    });

    const flow = createPasswordResetFlow();
    const result = await flow.request({
      email: validated.data.email,
      ttlMinutes: PASSWORD_RESET_TTL_MINUTES,
    });

    if ("token" in result && typeof result.token === "string" && result.token.length > 0) {
      const token = result.token;

      const url = absoluteUrl(`/reset-password?token=${encodeURIComponent(token)}`);

      await getEmailService().sendResetPassword(validated.data.email, url);
    }
  } catch {
    // intentionally swallow to prevent user enumeration
  }

  // mitigate timing attacks
  const elapsed = Date.now() - start;
  if (elapsed < 400) {
    await new Promise<void>((resolve) => setTimeout(resolve, 400 - elapsed));
  }

  return {
    error: null,
    success: FORGOT_PASSWORD_SUCCESS_MESSAGE,
    fieldErrors: {},
  };
}
