import type {
  AuthenticationFlashErrorCode,
  AuthenticationFlashSuccessCode,
} from "./sign-in-methods.types";

export const AUTHENTICATION_ERROR_MESSAGES: Partial<
  Record<AuthenticationFlashErrorCode, string>
> = {
  oauth_cancelled: "OAuth flow was cancelled. No changes were saved.",
  oauth_failed: "OAuth failed. Please try again.",
  oauth_invalid: "OAuth response is invalid.",
  identity_already_linked: "This identity is already linked to another account.",
  must_add_another_method_first: "You must add another sign-in method first.",
  reauth_required: "Please re-authenticate to continue.",
};

export const AUTHENTICATION_SUCCESS_MESSAGES: Partial<
  Record<AuthenticationFlashSuccessCode, string>
> = {
  google_connected: "Google connected successfully.",
  github_connected: "GitHub connected successfully.",
};
