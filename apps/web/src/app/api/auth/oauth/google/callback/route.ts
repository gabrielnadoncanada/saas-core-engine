import { NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "@/server/config/env";
import { setSessionCookie } from "@/server/adapters/cookies/session-cookie.adapter";
import {
  createOAuthLoginFlow,
  createOAuthStateService,
  createSessionService,
} from "@/server/adapters/core/auth-core.adapter";

const googleJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

type GoogleIdTokenPayload = {
  sub: string;
  email?: string;
  email_verified?: boolean;
};

async function exchangeCodeForTokens(params: {
  code: string;
  codeVerifier: string;
}) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
      grant_type: "authorization_code",
      code: params.code,
      code_verifier: params.codeVerifier,
    }),
  });

  if (!res.ok) throw new Error("Google token exchange failed");

  const json = (await res.json()) as {
    access_token?: string;
    id_token?: string;
    token_type?: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
  };

  if (!json.id_token) throw new Error("Missing id_token from Google");

  return json;
}

async function verifyGoogleIdToken(
  idToken: string,
): Promise<GoogleIdTokenPayload> {
  const { payload } = await jwtVerify(idToken, googleJwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: env.GOOGLE_OAUTH_CLIENT_ID,
  });

  return payload as unknown as GoogleIdTokenPayload;
}

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
    const tokens = await exchangeCodeForTokens({
      code,
      codeVerifier: consumed.codeVerifier,
    });
    const idPayload = await verifyGoogleIdToken(tokens.id_token!);

    const providerAccountId = idPayload.sub;
    const email = idPayload.email ?? null;
    const emailVerified = Boolean(idPayload.email_verified);

    const oauthFlow = createOAuthLoginFlow();
    const linked = await oauthFlow.linkOrCreate({
      provider: "google",
      providerAccountId,
      email,
      emailVerified,
    });

    const sessions = createSessionService();
    const session = await sessions.createSession({
      userId: linked.userId,
      ttlDays: env.SESSION_TTL_DAYS,
      userAgent: req.headers.get("user-agent"),
    });

    setSessionCookie(session);

    return NextResponse.redirect(
      new URL(consumed.redirectUri || "/dashboard", req.url),
    );
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
  }
}