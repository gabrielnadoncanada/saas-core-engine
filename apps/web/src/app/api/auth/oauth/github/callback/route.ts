import { GitHubProvider } from "@auth-core";
import { NextResponse } from "next/server";

import { setSessionCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import {
  createOAuthLoginFlow,
  createOAuthStateService,
  createSessionService,
} from "@/server/adapters/core/auth-core.adapter";
import { env } from "@/server/config/env";
import { withApiTelemetry } from "@/server/telemetry/otel";

const github = new GitHubProvider();

export async function GET(req: Request) {
  return withApiTelemetry(req, "/api/auth/oauth/github/callback", async () => {
    if (
      !env.GITHUB_OAUTH_CLIENT_ID ||
      !env.GITHUB_OAUTH_CLIENT_SECRET ||
      !env.GITHUB_OAUTH_REDIRECT_URI
    ) {
      return NextResponse.redirect(
        new URL("/login?error=oauth_not_configured", req.url),
      );
    }

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect(new URL("/login?error=oauth_invalid", req.url));
    }

    const stateSvc = createOAuthStateService();
    const consumed = await stateSvc.consume({
      provider: "github",
      state,
    });

    if (!consumed) {
      return NextResponse.redirect(new URL("/login?error=oauth_expired", req.url));
    }

    try {
      const claims = await github.exchangeCode({
        code,
        codeVerifier: consumed.codeVerifier,
        clientId: env.GITHUB_OAUTH_CLIENT_ID,
        clientSecret: env.GITHUB_OAUTH_CLIENT_SECRET,
        redirectUri: env.GITHUB_OAUTH_REDIRECT_URI,
      });

      const oauthFlow = createOAuthLoginFlow();
      const linked = await oauthFlow.linkOrCreate({
        provider: "github",
        providerAccountId: claims.sub,
        email: claims.email,
        emailVerified: claims.emailVerified,
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
      return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
    }
  });
}
