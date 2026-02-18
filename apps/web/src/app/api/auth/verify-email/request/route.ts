import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/require-user";
import { createVerifyEmailRequestFlow } from "@/server/adapters/core/auth-core.adapter";
import { getEmailService } from "@/server/services/email.service";
import { absoluteUrl } from "@/server/services/url.service";
import { enforceAuthRateLimit } from "@/server/auth/auth-rate-limit";
import { authErrorResponse } from "@/server/auth/auth-error-response";

export async function POST(req: Request) {
  try {
    await enforceAuthRateLimit(req, "verify_email_request");

    const session = await requireUser();
    const verifyEmailRequest = createVerifyEmailRequestFlow();
    const result = await verifyEmailRequest.execute({
      userId: session.userId,
      ttlMinutes: 60,
    });

    if (result.alreadyVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const url = absoluteUrl(
      `/api/auth/verify-email/confirm?token=${encodeURIComponent(result.token)}`,
    );
    await getEmailService().sendVerifyEmail(result.email, url);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
