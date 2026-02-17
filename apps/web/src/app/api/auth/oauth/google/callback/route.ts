import { NextResponse } from "next/server";
import { GoogleProvider, oidcNonceFromCodeVerifier } from "@auth-core";
import { env } from "@/server/config/env";
import { setSessionCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import {
  createOAuthLoginFlow,
  createOAuthStateService,
  createSessionService,
} from "@/server/adapters/core/auth-core.adapter";

const google = new GoogleProvider(env.GOOGLE_OAUTH_CLIENT_ID);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
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

  try {
    const claims = await google.exchangeCode({
      code,
      codeVerifier: consumed.codeVerifier,
      expectedNonce: oidcNonceFromCodeVerifier(consumed.codeVerifier),
      clientId: env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI,
    });

    const oauthFlow = createOAuthLoginFlow();
    const linked = await oauthFlow.linkOrCreate({
      provider: "google",
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
}
