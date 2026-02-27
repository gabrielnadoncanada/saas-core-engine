"use server";

import { AuthCoreError, hashPassword, isUniqueConstraintViolation } from "@auth-core";
import { withTx } from "@db";
import { redirect } from "next/navigation";

import {
  inviteSignupSchema,
  signupFormSchema,
} from "@/features/auth/sign-up/model/sign-up.schema";
import { type SignupFormState } from "@/features/auth/sign-up/model/sign-up.form-state";
import { getLoginRedirectFromSignup } from "@/features/auth/sign-up/lib/sign-up-redirect.guard";
import {
  InviteSignupError,
  inviteSignupErrorMessage,
} from "@/features/auth/sign-up/model/invite-signup.error";

import {
  createSignupFlow,
  createVerifyEmailFlow,
} from "@/server/adapters/core/auth-core.adapter";
import { createInviteService } from "@/server/adapters/core/org-core.adapter";
import { authErrorMessage } from "@/server/auth/auth-error-message";
import { enforceAuthRateLimit } from "@/server/auth/auth-rate-limit";
import { createAndSetSession } from "@/server/auth/create-and-set-session";
import { env } from "@/server/config/env";
import { InvitationsRepo } from "@/server/db-repos/invitations.repo";
import { MembershipsRepo } from "@/server/db-repos/memberships.repo";
import { UsersRepo } from "@/server/db-repos/users.repo";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";
import { routes } from "@/shared/constants/routes";

import { buildActionRequest } from "@/server/http/build-server-action-request";

const SIGNUP_ACTION_PATH = "/signup";
const SIGNUP_RATE_LIMIT_KEY = "signup" as const;

const INVALID_INPUT_MESSAGE = "Invalid input.";
const SIGNUP_FAILED_MESSAGE = "Signup failed.";

async function completeInvitedSignup(params: {
  email: string;
  password: string;
  inviteToken: string;
}) {
  const inviteService = createInviteService();
  const inviteLookup = await inviteService.getInviteForToken(params.inviteToken);

  if (inviteLookup.status === "invalid") throw new InviteSignupError("invalid_invite");
  if (inviteLookup.status === "expired") throw new InviteSignupError("invite_expired");
  if (inviteLookup.status === "accepted") throw new InviteSignupError("invite_already_accepted");

  const normalizedEmail = params.email.toLowerCase();
  if (normalizedEmail !== inviteLookup.invite.email.toLowerCase()) {
    throw new InviteSignupError("invite_email_mismatch");
  }

  const users = new UsersRepo();
  const memberships = new MembershipsRepo();
  const invitations = new InvitationsRepo();

  return withTx(async (tx) => {
    const existing = await users.findByEmail(normalizedEmail, tx);
    if (existing) throw new AuthCoreError("email_in_use", "Email already in use");

    const passwordHash = await hashPassword(params.password);

    let user;
    try {
      user = await users.create({ email: normalizedEmail, passwordHash }, tx);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new AuthCoreError("email_in_use", "Email already in use");
      }
      throw error;
    }

    const invite = await invitations.findById(inviteLookup.invite.id, tx);
    if (!invite) throw new InviteSignupError("invalid_invite");
    if (invite.acceptedAt) throw new InviteSignupError("invite_already_accepted");
    if (invite.expiresAt <= new Date()) throw new InviteSignupError("invite_expired");

    await memberships.ensureMembership(
      {
        userId: user.id,
        organizationId: invite.organizationId,
        role: invite.role,
      },
      tx,
    );

    const accepted = await invitations.markAcceptedIfPending(invite.id, tx);
    if (!accepted) throw new InviteSignupError("invite_already_accepted");

    await users.setActiveOrganization(user.id, invite.organizationId, tx);
    await users.markEmailVerified(user.id, undefined, tx);

    return { userId: user.id };
  });
}

export async function signupAction(
  _prevState: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const redirectParam = String(formData.get("redirect") ?? "");
  const inviteToken = String(formData.get("invite") ?? "");

  const rawInput = {
    orgName: formData.get("orgName"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  };

  try {
    const req = await buildActionRequest(SIGNUP_ACTION_PATH);
    await enforceAuthRateLimit(req, SIGNUP_RATE_LIMIT_KEY);

    // Invited signup path
    if (inviteToken) {
      const inviteValidated = inviteSignupSchema.safeParse(rawInput);
      if (!inviteValidated.success) {
        const flattened = inviteValidated.error.flatten();
        const message = inviteValidated.error.errors[0]?.message ?? INVALID_INPUT_MESSAGE;
        return { error: message, fieldErrors: flattened.fieldErrors };
      }

      const invitedSignup = await completeInvitedSignup({
        email: inviteValidated.data.email,
        password: inviteValidated.data.password,
        inviteToken,
      });

      await createAndSetSession({ userId: invitedSignup.userId, request: req });
      redirect(routes.app.dashboard);
    }

    // Regular signup path
    const validated = signupFormSchema.safeParse(rawInput);
    if (!validated.success) {
      const flattened = validated.error.flatten();
      const message = validated.error.errors[0]?.message ?? INVALID_INPUT_MESSAGE;
      return { error: message, fieldErrors: flattened.fieldErrors };
    }

    const signup = createSignupFlow();
    const { userId } = await signup.execute({
      email: validated.data.email,
      password: validated.data.password,
      orgName: validated.data.orgName,
    });

    // Non-blocking email verify request
    try {
      const verifyFlow = createVerifyEmailFlow();
      const issued = await verifyFlow.request({
        userId,
        email: validated.data.email,
        ttlMinutes: 60,
      });

      const params = new URLSearchParams({ token: issued.token });
      const verifyUrl = absoluteUrl(`/api/auth/verify-email/confirm?${params.toString()}`);

      await getEmailService().sendVerifyEmail(validated.data.email, verifyUrl);
    } catch {
      // signup remains successful even if email delivery fails
    }

    const loginUrl = new URL(getLoginRedirectFromSignup(redirectParam || null), absoluteUrl("/"));

    loginUrl.searchParams.set("signup", "success");

    redirect(loginUrl.toString());
  } catch (error) {
    if (error instanceof InviteSignupError) {
      return { error: inviteSignupErrorMessage(error.code) };
    }

    if (error instanceof AuthCoreError && error.code === "email_in_use") {
      const loginUrl = new URL(getLoginRedirectFromSignup(redirectParam || null), absoluteUrl("/"));

      loginUrl.searchParams.set("reason", "email_in_use");

      redirect(loginUrl.toString());
    }

    return { error: authErrorMessage(error, SIGNUP_FAILED_MESSAGE) };
  }
}
