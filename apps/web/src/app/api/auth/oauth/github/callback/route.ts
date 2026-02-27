import { GitHubProvider } from "@auth-core";

import { handleOAuthCallback } from "@/server/auth/oauth-callback.handler";
import { env } from "@/server/config/env";
import { withApiTelemetry } from "@/server/telemetry/otel";

const github = new GitHubProvider();

export async function GET(req: Request) {
  return withApiTelemetry(req, "/api/auth/oauth/github/callback", () =>
    handleOAuthCallback({
      provider: "github",
      request: req,
      exchangeFn: (code, codeVerifier) =>
        github.exchangeCode({
          code,
          codeVerifier,
          clientId: env.GITHUB_OAUTH_CLIENT_ID!,
          clientSecret: env.GITHUB_OAUTH_CLIENT_SECRET!,
          redirectUri: env.GITHUB_OAUTH_REDIRECT_URI!,
        }),
    }),
  );
}
