import { NextResponse } from "next/server";
import { prisma } from "@db";

import { createVerifyEmailFlow } from "@/server/adapters/core/auth-core.adapter";
import { getSessionUser } from "@/server/auth/require-user";
import { logError, logInfo, logWarn } from "@/server/logging/logger";
import { absoluteUrl } from "@/server/services/url.service";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const requestId = req.headers.get("x-request-id") ?? null;
  const tokenMeta = token
    ? { tokenLength: token.length, tokenSuffix: token.slice(-6) }
    : { tokenLength: 0, tokenSuffix: null };

  try {
    if (!token) {
      logWarn("auth.verify_email.confirm.missing_token", { requestId });
      return NextResponse.redirect(
        absoluteUrl("/dashboard?error=missing_verification_token"),
      );
    }

    const flow = createVerifyEmailFlow();
    const result = await flow.confirm({ token });

    if (!result.ok) {
      // Verification links are single-use. If the user is already verified (for example,
      // first click consumed the token), keep UX successful instead of showing expired.
      const session = await getSessionUser();
      if (session) {
        const user = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { emailVerifiedAt: true },
        });
        if (user?.emailVerifiedAt) {
          logInfo("auth.verify_email.confirm.already_verified_fallback", {
            requestId,
            userId: session.userId,
            ...tokenMeta,
          });
          return NextResponse.redirect(absoluteUrl("/dashboard?verified=true"));
        }
      }

      logWarn("auth.verify_email.confirm.invalid_or_expired", {
        requestId,
        ...tokenMeta,
      });
      return NextResponse.redirect(
        absoluteUrl("/dashboard?error=expired_verification_link"),
      );
    }

    logInfo("auth.verify_email.confirm.succeeded", {
      requestId,
      userId: result.userId,
      ...tokenMeta,
    });
    return NextResponse.redirect(absoluteUrl("/dashboard?verified=true"));
  } catch (error) {
    logError("auth.verify_email.confirm.failed", {
      requestId,
      ...tokenMeta,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.redirect(
      absoluteUrl("/dashboard?error=expired_verification_link"),
    );
  }
}
