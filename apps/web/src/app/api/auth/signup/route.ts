import { AuthCoreError, hashPassword, isUniqueConstraintViolation } from "@auth-core";
import { withTx } from "@db";
import { NextResponse } from "next/server";

import { setSessionCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import {
  createSessionService,
  createSignupFlow,
  createVerifyEmailFlow,
} from "@/server/adapters/core/auth-core.adapter";
import { createInviteService } from "@/server/adapters/core/org-core.adapter";
import { authErrorResponse } from "@/server/auth/auth-error-response";
import { enforceAuthRateLimit } from "@/server/auth/auth-rate-limit";
import { env } from "@/server/config/env";
import { InvitationsRepo } from "@/server/db-repos/invitations.repo";
import { MembershipsRepo } from "@/server/db-repos/memberships.repo";
import { UsersRepo } from "@/server/db-repos/users.repo";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";
import { withApiTelemetry } from "@/server/telemetry/otel";

type Body = {
  email: string;
  password: string;
  orgName?: string;
  inviteToken?: string;
};

type InviteSignupErrorCode =
  | "invalid_invite"
  | "invite_expired"
  | "invite_already_accepted"
  | "invite_email_mismatch";

function inviteSignupErrorResponse(code: InviteSignupErrorCode) {
  return NextResponse.json({ ok: false, error: code }, { status: 400 });
}

async function completeInvitedSignup(params: { email: string; password: string; inviteToken: string }) {
  const inviteService = createInviteService();
  const inviteLookup = await inviteService.getInviteForToken(params.inviteToken);

  if (inviteLookup.status === "invalid") {
    throw { code: "invalid_invite" } as { code: InviteSignupErrorCode };
  }
  if (inviteLookup.status === "expired") {
    throw { code: "invite_expired" } as { code: InviteSignupErrorCode };
  }
  if (inviteLookup.status === "accepted") {
    throw { code: "invite_already_accepted" } as { code: InviteSignupErrorCode };
  }

  const normalizedEmail = params.email.toLowerCase();
  if (normalizedEmail !== inviteLookup.invite.email.toLowerCase()) {
    throw { code: "invite_email_mismatch" } as { code: InviteSignupErrorCode };
  }

  const users = new UsersRepo();
  const memberships = new MembershipsRepo();
  const invitations = new InvitationsRepo();

  const result = await withTx(async (tx) => {
    const existing = await users.findByEmail(normalizedEmail, tx);
    if (existing) {
      throw new AuthCoreError("email_in_use", "Email already in use");
    }

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
    if (!invite) {
      throw { code: "invalid_invite" } as { code: InviteSignupErrorCode };
    }
    if (invite.acceptedAt) {
      throw { code: "invite_already_accepted" } as { code: InviteSignupErrorCode };
    }
    if (invite.expiresAt <= new Date()) {
      throw { code: "invite_expired" } as { code: InviteSignupErrorCode };
    }

    await memberships.ensureMembership(
      {
        userId: user.id,
        organizationId: invite.organizationId,
        role: invite.role,
      },
      tx,
    );

    const accepted = await invitations.markAcceptedIfPending(invite.id, tx);
    if (!accepted) {
      throw { code: "invite_already_accepted" } as { code: InviteSignupErrorCode };
    }

    await users.setActiveOrganization(user.id, invite.organizationId, tx);
    await users.markEmailVerified(user.id, tx);

    return {
      userId: user.id,
      organizationId: invite.organizationId,
      email: normalizedEmail,
    };
  });

  return result;
}

export async function POST(req: Request) {
  return withApiTelemetry(req, "/api/auth/signup", async () => {
    try {
      await enforceAuthRateLimit(req, "signup");

      const body = (await req.json()) as Body;

      if (!body?.email || !body?.password) {
        return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
      }

      const inviteToken = typeof body.inviteToken === "string" ? body.inviteToken : undefined;

      if (inviteToken) {
        let invitedSignup;
        try {
          invitedSignup = await completeInvitedSignup({
            email: body.email,
            password: body.password,
            inviteToken,
          });
        } catch (error) {
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            typeof (error as { code?: unknown }).code === "string"
          ) {
            const code = (error as { code: string }).code;
            if (
              code === "invalid_invite" ||
              code === "invite_expired" ||
              code === "invite_already_accepted" ||
              code === "invite_email_mismatch"
            ) {
              return inviteSignupErrorResponse(code);
            }
          }
          throw error;
        }

        const sessions = createSessionService();
        const session = await sessions.createSession({
          userId: invitedSignup.userId,
          ttlDays: env.SESSION_TTL_DAYS,
          ip: null,
          userAgent: req.headers.get("user-agent"),
        });
        await setSessionCookie(session);

        return NextResponse.json({ ok: true, invited: true });
      }

      if (!body?.orgName) {
        return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
      }

      const signup = createSignupFlow();

      const { userId } = await signup.execute({
        email: body.email,
        password: body.password,
        orgName: body.orgName,
      });

      // Send verification email (fire-and-forget)
      try {
        const verifyFlow = createVerifyEmailFlow();
        const issued = await verifyFlow.request({
          userId,
          email: body.email,
          ttlMinutes: 60,
        });
        const verifyUrl = absoluteUrl(
          `/api/auth/verify-email/confirm?token=${encodeURIComponent(issued.token)}`,
        );
        await getEmailService().sendVerifyEmail(body.email, verifyUrl);
      } catch {
        // Non-blocking: signup succeeds even if verification email fails
      }

      return NextResponse.json({ ok: true });
    } catch (error) {
      // Anti-enumeration: don't expose account existence on regular signup.
      if (error instanceof AuthCoreError && error.code === "email_in_use") {
        return NextResponse.json({ ok: true });
      }
      return authErrorResponse(error);
    }
  });
}
