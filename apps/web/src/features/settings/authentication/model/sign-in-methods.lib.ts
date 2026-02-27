import type { OAuthProvider } from "@contracts";

import {
  AUTHENTICATION_ERROR_MESSAGES,
  AUTHENTICATION_SUCCESS_MESSAGES,
} from "./sign-in-methods.constants";
import type { AuthenticationFlash, SignInMethod } from "./sign-in-methods.types";

export function isOAuthProvider(provider: SignInMethod["provider"]): provider is OAuthProvider {
  return provider !== "email";
}

export function formatProviderLabel(provider: string): string {
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export function formatFlashSuccessMessage(value: string): string {
  const mapped = AUTHENTICATION_SUCCESS_MESSAGES[value];
  if (mapped) return mapped;

  if (value.endsWith("_connected")) {
    const provider = value.slice(0, -"_connected".length);
    return `${formatProviderLabel(provider)} connected successfully.`;
  }

  return value;
}

export function formatFlashMessage(flash: AuthenticationFlash): string | null {
  if (flash.flashSuccess) return formatFlashSuccessMessage(flash.flashSuccess);
  if (flash.flashError) return AUTHENTICATION_ERROR_MESSAGES[flash.flashError] ?? flash.flashError;
  return null;
}

export function formatLastUsed(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
