import type { OAuthProvider } from "@contracts";

export type AuthenticationFlashErrorCode =
  | "oauth_cancelled"
  | "oauth_failed"
  | "oauth_invalid"
  | "identity_already_linked"
  | "must_add_another_method_first"
  | "reauth_required"
  | (string & {});

export type AuthenticationFlashSuccessCode =
  | `${OAuthProvider}_connected`
  | (string & {});

export type SignInMethod = {
  provider: "email" | OAuthProvider;
  label: string;
  connected: boolean;
  linkedIdentifier?: string;
  lastUsedAt?: string;
  action: "connect" | "manage" | "disconnect";
  canDisconnect: boolean;
};

export type AuthenticationFlash = {
  flashError?: AuthenticationFlashErrorCode | null;
  flashSuccess?: AuthenticationFlashSuccessCode | null;
};
