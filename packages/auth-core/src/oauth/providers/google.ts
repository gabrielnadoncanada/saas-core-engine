import { createRemoteJWKSet, jwtVerify } from "jose";

export type GoogleTokenExchangeParams = {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GoogleIdTokenClaims = {
  sub: string;
  email: string | null;
  emailVerified: boolean;
};

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export class GoogleProvider {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly clientId: string) {
    this.jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URI));
  }

  async exchangeCode(
    params: GoogleTokenExchangeParams,
  ): Promise<GoogleIdTokenClaims> {
    const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: params.clientId,
        client_secret: params.clientSecret,
        redirect_uri: params.redirectUri,
        grant_type: "authorization_code",
        code: params.code,
        code_verifier: params.codeVerifier,
      }),
    });

    if (!res.ok) throw new Error("Google token exchange failed");

    const json = (await res.json()) as { id_token?: string };
    if (!json.id_token) throw new Error("Missing id_token from Google");

    const { payload } = await jwtVerify(json.id_token, this.jwks, {
      issuer: GOOGLE_ISSUERS,
      audience: this.clientId,
    });

    return {
      sub: payload.sub as string,
      email: (payload.email as string) ?? null,
      emailVerified: Boolean(payload.email_verified),
    };
  }
}
