"use server";

import { redirect } from "next/navigation";

import { setSessionCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import { createLoginFlow, createSessionService } from "@/server/adapters/core/auth-core.adapter";
import { authErrorMessage } from "@/server/auth/auth-error-message";
import { enforceAuthRateLimit } from "@/server/auth/auth-rate-limit";
import { env } from "@/server/config/env";

import { buildActionRequest } from "@/server/http/build-server-action-request";
import { getDashboardRedirectPath } from "@/features/auth/lib/auth-redirect.guard";
import { loginFormSchema } from "@/features/auth/sign-in/model/sign-in.schema";

const LOGIN_ACTION_PATH = "/login";
const LOGIN_RATE_LIMIT_KEY = "login" as const;
const INVALID_INPUT_MESSAGE = "Invalid input";
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";
const LOGIN_FAILED_MESSAGE = "Login failed.";

export type LoginFormState = {
  error: string | null;
};

export const loginInitialState: LoginFormState = { error: null };

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const validated = loginFormSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!validated.success) {
    return { error: validated.error.errors[0]?.message ?? INVALID_INPUT_MESSAGE };
  }

  const redirectPath = getDashboardRedirectPath(String(formData.get("redirect") ?? ""));

  try {
    const req = await buildActionRequest(LOGIN_ACTION_PATH);
    await enforceAuthRateLimit(req, LOGIN_RATE_LIMIT_KEY);

    const login = createLoginFlow();
    const result = await login.execute({
      email: validated.data.email,
      password: validated.data.password,
    });

    if (!result.ok) {
      return { error: INVALID_CREDENTIALS_MESSAGE };
    }

    const sessions = createSessionService();
    const session = await sessions.createSession({
      userId: result.userId,
      ttlDays: env.SESSION_TTL_DAYS,
      ip: null,
      userAgent: req.headers.get("user-agent"),
    });

    await setSessionCookie(session);
  } catch (error) {
    return { error: authErrorMessage(error, LOGIN_FAILED_MESSAGE) };
  }

  redirect(redirectPath);
}
