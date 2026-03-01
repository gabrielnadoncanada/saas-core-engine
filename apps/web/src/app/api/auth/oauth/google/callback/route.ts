import { GoogleProvider, oidcNonceFromCodeVerifier } from "@auth-core";

import { handleOAuthCallback } from "@/server/auth/oauth-callback.handler";
import { isOAuthProviderEnabled } from "@/server/auth/sign-in-methods";
import { env } from "@/server/config/env";
import { withApiTelemetry } from "@/server/telemetry/otel";

export async function GET(req: Request) {
  if (!isOAuthProviderEnabled("google")) {
    return Response.redirect(new URL("/login?error=oauth_not_configured", req.url), 302);
  }
  const google = new GoogleProvider(env.GOOGLE_OAUTH_CLIENT_ID!);
  return withApiTelemetry(req, "/api/auth/oauth/google/callback", () =>
    handleOAuthCallback({
      provider: "google",
      request: req,
      exchangeFn: (code, codeVerifier) =>
        google.exchangeCode({
          code,
          codeVerifier,
          expectedNonce: oidcNonceFromCodeVerifier(codeVerifier),
          clientId: env.GOOGLE_OAUTH_CLIENT_ID!,
          clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET!,
          redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI!,
        }),
    }),
  );
}
