import { NextResponse } from "next/server";
import { prisma } from "@db";

import { createVerifyEmailFlow } from "@/server/adapters/core/auth-core.adapter";
import { getSessionUser } from "@/server/auth/require-user";
import { logError, logInfo, logWarn } from "@/server/logging/logger";
import { absoluteUrl } from "@/server/services/url.service";
import { routes } from "@/shared/constants/routes";

function dashboardErrorUrl(error: string) {
  return absoluteUrl(`/dashboard?error=${encodeURIComponent(error)}`);
}

function dashboardVerifiedUrl() {
  return absoluteUrl("/dashboard?verified=true");
}

function settingsEmailChangeUrl(status: "verified" | "expired" | "missing_token") {
  return absoluteUrl(
    `${routes.app.settingsProfile}?email_change=${encodeURIComponent(status)}`,
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const requestId = req.headers.get("x-request-id") ?? null;

  try {
    if (!token) {
      logWarn("auth.verify_email.confirm.missing_token", { requestId });
      const session = await getSessionUser();
      return NextResponse.redirect(
        session ? settingsEmailChangeUrl("missing_token") : dashboardErrorUrl("missing_verification_token"),
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
          });
          const pending = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { pendingEmail: true },
          });
          return NextResponse.redirect(
            pending?.pendingEmail ? settingsEmailChangeUrl("verified") : dashboardVerifiedUrl(),
          );
        }
      }

      logWarn("auth.verify_email.confirm.invalid_or_expired", {
        requestId,
      });
      const retrySession = await getSessionUser();
      return NextResponse.redirect(
        retrySession ? settingsEmailChangeUrl("expired") : dashboardErrorUrl("expired_verification_link"),
      );
    }

    logInfo("auth.verify_email.confirm.succeeded", {
      requestId,
      userId: result.userId,
    });
    const session = await getSessionUser();
    return NextResponse.redirect(
      session ? settingsEmailChangeUrl("verified") : dashboardVerifiedUrl(),
    );
  } catch (error) {
    logError("auth.verify_email.confirm.failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.redirect(
      dashboardErrorUrl("expired_verification_link"),
    );
  }
}
