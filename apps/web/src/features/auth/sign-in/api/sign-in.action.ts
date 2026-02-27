"use server";

import { redirect } from "next/navigation";

import { createLoginFlow } from "@/server/adapters/core/auth-core.adapter";
import { authErrorMessage } from "@/server/auth/auth-error-message";
import { enforceAuthRateLimit } from "@/server/auth/auth-rate-limit";
import { createAndSetSession } from "@/server/auth/create-and-set-session";

import { buildActionRequest } from "@/server/http/build-server-action-request";
import { getDashboardRedirectPath } from "@/features/auth/shared/lib/auth-redirect.guard";
import type { LoginFormState } from "@/features/auth/sign-in/model/sign-in.form-state";
import { loginFormSchema } from "@/features/auth/sign-in/model/sign-in.schema";

const LOGIN_ACTION_PATH = "/login";
const LOGIN_RATE_LIMIT_KEY = "login" as const;
const INVALID_INPUT_MESSAGE = "Invalid input";
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";
const LOGIN_FAILED_MESSAGE = "Login failed.";

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const validated = loginFormSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!validated.success) {
    const flattened = validated.error.flatten();
    return {
      error: validated.error.errors[0]?.message ?? INVALID_INPUT_MESSAGE,
      fieldErrors: flattened.fieldErrors,
    };
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

    await createAndSetSession({ userId: result.userId, request: req });
  } catch (error) {
    return { error: authErrorMessage(error, LOGIN_FAILED_MESSAGE) };
  }

  redirect(redirectPath);
}
