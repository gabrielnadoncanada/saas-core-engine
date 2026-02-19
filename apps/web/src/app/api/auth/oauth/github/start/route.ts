import { codeChallengeS256, safeRedirectPath } from "@auth-core";
import { NextResponse } from "next/server";

import { createOAuthStateService } from "@/server/adapters/core/auth-core.adapter";
import { authErrorResponse } from "@/server/auth/auth-error-response";
import { enforceAuthRateLimit } from "@/server/auth/auth-rate-limit";
import { env } from "@/server/config/env";
import { withApiTelemetry } from "@/server/telemetry/otel";

export async function GET(req: Request) {
  return withApiTelemetry(req, "/api/auth/oauth/github/start", async () => {
    try {
      await enforceAuthRateLimit(req, "oauth_start");
      if (!env.GITHUB_OAUTH_CLIENT_ID || !env.GITHUB_OAUTH_REDIRECT_URI) {
        return NextResponse.redirect(new URL("/login?error=oauth_not_configured", req.url));
      }

      const url = new URL(req.url);
      const redirect = safeRedirectPath(url.searchParams.get("redirect"));

      const stateSvc = createOAuthStateService();
      const { state, codeVerifier } = await stateSvc.create({
        provider: "github",
        redirectPath: redirect,
        ttlMinutes: 10,
      });

      const codeChallenge = codeChallengeS256(codeVerifier);

      const authorize = new URL("https://github.com/login/oauth/authorize");
      authorize.searchParams.set("client_id", env.GITHUB_OAUTH_CLIENT_ID);
      authorize.searchParams.set("redirect_uri", env.GITHUB_OAUTH_REDIRECT_URI);
      authorize.searchParams.set("scope", env.GITHUB_OAUTH_SCOPES);
      authorize.searchParams.set("state", state);
      authorize.searchParams.set("code_challenge", codeChallenge);
      authorize.searchParams.set("code_challenge_method", "S256");

      return NextResponse.redirect(authorize.toString());
    } catch (error) {
      return authErrorResponse(error);
    }
  });
}
