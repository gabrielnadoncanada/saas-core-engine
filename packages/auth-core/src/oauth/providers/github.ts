export type GitHubTokenExchangeParams = {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GitHubUserClaims = {
  sub: string;
  email: string | null;
  emailVerified: boolean;
};

const GITHUB_TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token";
const GITHUB_USER_ENDPOINT = "https://api.github.com/user";
const GITHUB_EMAILS_ENDPOINT = "https://api.github.com/user/emails";

type GitHubTokenResponse = {
  access_token?: string;
};

type GitHubUserResponse = {
  id?: number;
  email?: string | null;
};

type GitHubEmailResponse = Array<{
  email: string;
  primary: boolean;
  verified: boolean;
}>;

export class GitHubProvider {
  async exchangeCode(
    params: GitHubTokenExchangeParams,
  ): Promise<GitHubUserClaims> {
    const tokenRes = await fetch(GITHUB_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: params.clientId,
        client_secret: params.clientSecret,
        code: params.code,
        redirect_uri: params.redirectUri,
        code_verifier: params.codeVerifier,
      }),
    });

    if (!tokenRes.ok) throw new Error("GitHub token exchange failed");

    const tokenJson = (await tokenRes.json()) as GitHubTokenResponse;
    if (!tokenJson.access_token) throw new Error("Missing access_token from GitHub");

    const accessToken = tokenJson.access_token;

    const userRes = await fetch(GITHUB_USER_ENDPOINT, {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/vnd.github+json",
      },
    });

    if (!userRes.ok) throw new Error("GitHub user profile fetch failed");

    const userJson = (await userRes.json()) as GitHubUserResponse;
    if (!userJson.id) throw new Error("Missing user id from GitHub");

    let email = userJson.email ?? null;
    let emailVerified = false;

    const emailsRes = await fetch(GITHUB_EMAILS_ENDPOINT, {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/vnd.github+json",
      },
    });

    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as GitHubEmailResponse;
      const primary = emails.find((item) => item.primary) ?? emails[0];
      if (primary) {
        email = primary.email;
        emailVerified = primary.verified;
      }
    }

    return {
      sub: String(userJson.id),
      email,
      emailVerified,
    };
  }
}
