import { NextResponse } from "next/server";
import { OAuthStateService } from "@auth-core/src/oauth/state.service"; // (voir note ci-dessous)
import { codeChallengeS256 } from "@auth-core/src/oauth/pkce";
import { env } from "@/server/config/env";

function safeRedirectPath(input: string | null): string {
  // Only allow relative internal redirects
  if (!input) return "/dashboard";
  if (!input.startsWith("/")) return "/dashboard";
  if (input.startsWith("//")) return "/dashboard";
  if (input.includes("http://") || input.includes("https://"))
    return "/dashboard";
  return input;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirect = safeRedirectPath(url.searchParams.get("redirect"));

  const stateSvc = new OAuthStateService();
  const { state, codeVerifier } = await stateSvc.create({
    provider: "google",
    redirectUri: redirect,
    ttlMinutes: 10,
    pepper: env.TOKEN_PEPPER,
  });

  const codeChallenge = codeChallengeS256(codeVerifier);

  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.searchParams.set("client_id", env.GOOGLE_OAUTH_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", env.GOOGLE_OAUTH_REDIRECT_URI);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", env.GOOGLE_OAUTH_SCOPES);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", codeChallenge);
  authorize.searchParams.set("code_challenge_method", "S256");
  authorize.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(authorize.toString());
}
