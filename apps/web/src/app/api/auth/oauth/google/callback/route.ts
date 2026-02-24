import { GoogleProvider, oidcNonceFromCodeVerifier } from "@auth-core";
import { Prisma, prisma } from "@db";
import { NextResponse } from "next/server";

import { setSessionCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import {
  createOAuthLoginFlow,
  createOAuthStateService,
  createSessionService,
} from "@/server/adapters/core/auth-core.adapter";
import { getSessionUser } from "@/server/auth/require-user";
import { isOAuthLinkIntent } from "@/server/auth/oauth-link-intent";
import { isOAuthProviderEnabled } from "@/server/auth/sign-in-methods";
import { env } from "@/server/config/env";
import { withApiTelemetry } from "@/server/telemetry/otel";

const google = new GoogleProvider(env.GOOGLE_OAUTH_CLIENT_ID);
const SETTINGS_PATH = "/dashboard/settings";

function settingsRedirect(
  req: Request,
  params: { error?: string; success?: string },
) {
  const url = new URL(SETTINGS_PATH, req.url);
  if (params.error) url.searchParams.set("signin_error", params.error);
  if (params.success) url.searchParams.set("signin_success", params.success);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  return withApiTelemetry(req, "/api/auth/oauth/google/callback", async () => {
    if (!isOAuthProviderEnabled("google")) {
      return NextResponse.redirect(
        new URL("/login?error=oauth_not_configured", req.url),
      );
    }

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");

    if (!state) {
      return NextResponse.redirect(
        new URL("/login?error=oauth_invalid", req.url),
      );
    }

    const stateSvc = createOAuthStateService();
    const consumed = await stateSvc.consume({
      provider: "google",
      state,
    });

    if (!consumed) {
      return NextResponse.redirect(
        new URL("/login?error=oauth_expired", req.url),
      );
    }

    const linking = isOAuthLinkIntent(consumed.redirectPath, "google");
    if (oauthError) {
      if (linking) return settingsRedirect(req, { error: "oauth_cancelled" });
      return NextResponse.redirect(new URL("/login?error=oauth_cancelled", req.url));
    }

    if (!code) {
      if (linking) return settingsRedirect(req, { error: "oauth_invalid" });
      return NextResponse.redirect(new URL("/login?error=oauth_invalid", req.url));
    }

    try {
      const claims = await google.exchangeCode({
        code,
        codeVerifier: consumed.codeVerifier,
        expectedNonce: oidcNonceFromCodeVerifier(consumed.codeVerifier),
        clientId: env.GOOGLE_OAUTH_CLIENT_ID,
        clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI,
      });

      if (linking) {
        const sessionUser = await getSessionUser();
        if (!sessionUser) {
          return settingsRedirect(req, { error: "reauth_required" });
        }

        try {
          await prisma.$transaction(async (tx) => {
            const existing = await tx.oAuthAccount.findUnique({
              where: {
                provider_providerAccountId: {
                  provider: "google",
                  providerAccountId: claims.sub,
                },
              },
            });

            if (existing && existing.userId !== sessionUser.userId) {
              throw new Error("oauth_identity_in_use");
            }

            if (existing && existing.userId === sessionUser.userId) {
              await tx.oAuthAccount.update({
                where: { id: existing.id },
                data: {
                  email: claims.email?.toLowerCase() ?? existing.email,
                },
              });
              return;
            }

            await tx.oAuthAccount.create({
              data: {
                userId: sessionUser.userId,
                provider: "google",
                providerAccountId: claims.sub,
                email: claims.email?.toLowerCase() ?? null,
              },
            });
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === "oauth_identity_in_use"
          ) {
            return settingsRedirect(req, { error: "identity_already_linked" });
          }
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            return settingsRedirect(req, { error: "identity_already_linked" });
          }
          throw error;
        }

        return settingsRedirect(req, { success: "google_connected" });
      }

      const oauthFlow = createOAuthLoginFlow();
      const linked = await oauthFlow.linkOrCreate({
        provider: "google",
        providerAccountId: claims.sub,
        email: claims.email,
        emailVerified: claims.emailVerified,
      });

      await prisma.oAuthAccount.updateMany({
        where: {
          userId: linked.userId,
          provider: "google",
          providerAccountId: claims.sub,
        },
        data: {
          lastUsedAt: new Date(),
          email: claims.email?.toLowerCase() ?? null,
        },
      });

      const sessions = createSessionService();
      const session = await sessions.createSession({
        userId: linked.userId,
        ttlDays: env.SESSION_TTL_DAYS,
        userAgent: req.headers.get("user-agent"),
      });

      await setSessionCookie(session);

      return NextResponse.redirect(
        new URL(consumed.redirectPath || "/dashboard", req.url),
      );
    } catch {
      if (linking) return settingsRedirect(req, { error: "oauth_failed" });
      return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
    }
  });
}
