"use server";

import { createPasswordResetFlow } from "@/server/adapters/core/auth-core.adapter";
import { enforceAuthRateLimit } from "@/server/auth/auth-rate-limit";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";

import { buildActionRequest } from "@/server/http/build-server-action-request";
import { type ActionResult, fail, ok } from "@/shared/types";

const PASSWORD_RESET_ACTION_PATH = "/settings/password-reset";
const PASSWORD_RESET_RATE_LIMIT_KEY = "password_forgot" as const;
const PASSWORD_RESET_TTL_MINUTES = 15;

export async function requestPasswordResetAction(
  email: string,
): Promise<ActionResult> {
  try {
    const req = await buildActionRequest(PASSWORD_RESET_ACTION_PATH);
    await enforceAuthRateLimit(req, PASSWORD_RESET_RATE_LIMIT_KEY, {
      identifier: email,
    });

    const flow = createPasswordResetFlow();
    const result = await flow.request({
      email,
      ttlMinutes: PASSWORD_RESET_TTL_MINUTES,
    });

    if ("token" in result && typeof result.token === "string" && result.token.length > 0) {
      const url = absoluteUrl(`/reset-password?token=${encodeURIComponent(result.token)}`);
      await getEmailService().sendResetPassword(email, url);
    }
  } catch {
    // intentionally swallow to prevent user enumeration
  }

  return ok();
}
