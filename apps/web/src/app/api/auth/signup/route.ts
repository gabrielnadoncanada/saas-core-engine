import { NextResponse } from "next/server";
import { AuthCoreError } from "@auth-core";
import { env } from "@/server/config/env";
import { setSessionCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import {
  createSessionService,
  createSignupFlow,
  createVerifyEmailFlow,
} from "@/server/adapters/core/auth-core.adapter";
import { enforceAuthRateLimit } from "@/server/auth/auth-rate-limit";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";

type Body = { email: string; password: string; orgName: string };

export async function POST(req: Request) {
  try {
    await enforceAuthRateLimit(req, "signup");
  } catch (e) {
    if (e instanceof AuthCoreError && e.code === "rate_limited")
      return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
    throw e;
  }

  const body = (await req.json()) as Body;

  if (!body?.email || !body?.password || !body?.orgName) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const signup = createSignupFlow();

  try {
    const { userId, organizationId } = await signup.execute({
      email: body.email,
      password: body.password,
      orgName: body.orgName,
    });

    const sessions = createSessionService();
    const session = await sessions.createSession({
      userId,
      ttlDays: env.SESSION_TTL_DAYS,
    });

    await setSessionCookie(session);

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

    return NextResponse.json({ ok: true, userId, organizationId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Signup failed";
    const status =
      e instanceof AuthCoreError && e.code === "email_in_use" ? 409 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
