"use server";

import {
  clearSessionCookie,
  getSessionTokenFromCookie,
} from "@/server/adapters/cookies/session-cookie.adapter";
import {
  createSessionService,
  createVerifyEmailRequestFlow,
} from "@/server/adapters/core/auth-core.adapter";
import { enforceAuthRateLimit } from "@/server/auth/auth-rate-limit";
import { authErrorMessage } from "@/server/auth/auth-error-message";
import { requireUser } from "@/server/auth/require-user";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";

import { ActionResult, fail, ok } from "@/shared/types";

import { buildActionRequest } from "@/server/http/build-server-action-request";

const VERIFY_EMAIL_ACTION_PATH = "/verify-email";
const VERIFY_EMAIL_RATE_LIMIT_KEY = "verify_email_request" as const;
const VERIFY_EMAIL_CONFIRM_PATH = "/api/auth/verify-email/confirm";

async function revokeCurrentSession() {
  try {
    const token = await getSessionTokenFromCookie();
    if (!token) return;

    const sessions = createSessionService();
    const valid = await sessions.validateSession({ sessionToken: token });
    if (valid) await sessions.revokeSession(valid.sessionId);
  } finally {
    await clearSessionCookie();
  }
}

export async function logoutAction(): Promise<ActionResult> {
  await revokeCurrentSession();
  return ok();
}

export async function requestEmailVerificationAction(): Promise<ActionResult> {
  try {
    const req = await buildActionRequest(VERIFY_EMAIL_ACTION_PATH);
    await enforceAuthRateLimit(req, VERIFY_EMAIL_RATE_LIMIT_KEY);

    const session = await requireUser();

    const verifyEmailRequest = createVerifyEmailRequestFlow();
    const result = await verifyEmailRequest.execute({
      userId: session.userId,
      ttlMinutes: 60,
    });

    if (result.alreadyVerified) return ok();

    const params = new URLSearchParams({ token: result.token });
    const url = absoluteUrl(`${VERIFY_EMAIL_CONFIRM_PATH}?${params.toString()}`);

    await getEmailService().sendVerifyEmail(result.email, url);
    return ok();
  } catch (error) {
    return fail(authErrorMessage(error, "Failed to send verification email"));
  }
}
