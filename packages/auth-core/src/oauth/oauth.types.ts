import type { OAuthProvider } from "@prisma/client";

export type OAuthStartResult = {
  provider: OAuthProvider;
  state: string;
  codeVerifier: string;
  codeChallenge: string;
};

export type OAuthCallbackInput = {
  provider: OAuthProvider;
  code: string;
  state: string;
  pepper: string;
};
