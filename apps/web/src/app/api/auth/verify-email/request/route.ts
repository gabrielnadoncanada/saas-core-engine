import { NextResponse } from "next/server";
import { prisma } from "@db";
import { requireUser } from "@/server/auth/require-user";
import { createVerifyEmailFlow } from "@/server/adapters/core/auth-core.adapter";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";
import { enforceAuthRateLimit } from "@/server/auth/auth-rate-limit";
import { authErrorResponse } from "@/server/auth/auth-error-response";

export async function POST(req: Request) {
  try {
    await enforceAuthRateLimit(req, "verify_email_request");

    const session = await requireUser();

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
      select: { email: true, emailVerifiedAt: true },
    });

    if (user.emailVerifiedAt) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const flow = createVerifyEmailFlow();
    const issued = await flow.request({
      userId: session.userId,
      email: user.email,
      ttlMinutes: 60,
    });

    const url = absoluteUrl(
      `/api/auth/verify-email/confirm?token=${encodeURIComponent(issued.token)}`,
    );
    await getEmailService().sendVerifyEmail(user.email, url);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
