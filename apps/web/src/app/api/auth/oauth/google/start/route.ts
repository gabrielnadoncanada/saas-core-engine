import { codeChallengeS256, oidcNonceFromCodeVerifier } from "@auth-core";
import { NextResponse } from "next/server";

import { createOAuthStateService } from "@/server/adapters/core/auth-core.adapter";
import { authErrorResponse } from "@/server/auth/auth-error-response";
import { enforceAuthRateLimit } from "@/server/auth/auth-rate-limit";
import { env } from "@/server/config/env";
import { withApiTelemetry } from "@/server/telemetry/otel";

function safeRedirectPath(input: string | null): string {
  if (!input) return "/dashboard";
  if (!input.startsWith("/")) return "/dashboard";
  if (input.startsWith("//")) return "/dashboard";
  if (input.includes("..")) return "/dashboard";
  if (input.includes("\\")) return "/dashboard";
  if (input.includes("http://") || input.includes("https://"))
    return "/dashboard";
  return input;
}

export async function GET(req: Request) {
  return withApiTelemetry(req, "/api/auth/oauth/google/start", async () => {
    try {
      await enforceAuthRateLimit(req, "oauth_start");

    const url = new URL(req.url);
    const redirect = safeRedirectPath(url.searchParams.get("redirect"));

    const stateSvc = createOAuthStateService();
    const { state, codeVerifier } = await stateSvc.create({
      provider: "google",
      redirectPath: redirect,
      ttlMinutes: 10,
    });

    const codeChallenge = codeChallengeS256(codeVerifier);
    const nonce = oidcNonceFromCodeVerifier(codeVerifier);

    const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorize.searchParams.set("client_id", env.GOOGLE_OAUTH_CLIENT_ID);
    authorize.searchParams.set("redirect_uri", env.GOOGLE_OAUTH_REDIRECT_URI);
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("scope", env.GOOGLE_OAUTH_SCOPES);
    authorize.searchParams.set("state", state);
    authorize.searchParams.set("code_challenge", codeChallenge);
    authorize.searchParams.set("code_challenge_method", "S256");
    authorize.searchParams.set("nonce", nonce);
    authorize.searchParams.set("prompt", "select_account");

      return NextResponse.redirect(authorize.toString());
    } catch (error) {
      return authErrorResponse(error);
    }
  });
}
