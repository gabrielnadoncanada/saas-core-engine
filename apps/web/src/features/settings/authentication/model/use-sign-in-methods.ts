"use client";

import { useMemo, useState } from "react";
import type { OAuthProvider } from "@contracts";

import { disconnectSignInMethodAction } from "../api/disconnect-sign-in-method.action";
import { setPasswordSignInMethodAction } from "../api/set-password-sign-in-method.action";
import type { AuthenticationFlash, SignInMethod } from "./sign-in-methods.types";
import { routes } from "@/shared/constants/routes";
import {
  formatFlashMessage,
  formatLastUsed,
  formatProviderLabel,
  isOAuthProvider,
} from "./sign-in-methods.lib";

export type SignInMethodRowView = SignInMethod & {
  isBusy: boolean;
  isOAuth: boolean;
  statusText: string;
  lastUsedText: string | null;
  canConnect: boolean;
  canManage: boolean;
  canDisconnect: boolean;
};

export function useSignInMethods(initialMethods: SignInMethod[], flash: AuthenticationFlash) {
  const [methods, setMethods] = useState<SignInMethod[]>(initialMethods);
  const [message, setMessage] = useState<string | null>(() => formatFlashMessage(flash));
  const [busyProvider, setBusyProvider] = useState<SignInMethod["provider"] | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<SignInMethod | null>(null);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const emailMethod = useMemo(
    () => methods.find((method) => method.provider === "email"),
    [methods],
  );
  const methodRows = useMemo<SignInMethodRowView[]>(
    () =>
      methods.map((method) => {
        const isOAuth = isOAuthProvider(method.provider);
        return {
          ...method,
          isBusy: busyProvider === method.provider,
          isOAuth,
          statusText: method.connected ? "Connected" : "Not connected",
          lastUsedText: formatLastUsed(method.lastUsedAt),
          canConnect: method.action === "connect" && isOAuth,
          canManage: method.action === "manage" && method.provider === "email",
          canDisconnect: method.action === "disconnect" && isOAuth,
        };
      }),
    [methods, busyProvider],
  );

  function startConnect(provider: OAuthProvider) {
    const redirect = `${routes.app.settingsAuthentication}?oauth_intent=link&oauth_provider=${provider}`;
    window.location.href = `/api/auth/oauth/${provider}/start?redirect=${encodeURIComponent(redirect)}`;
  }

  async function submitDisconnect(provider: OAuthProvider) {
    setBusyProvider(provider);
    setMessage(null);
    try {
      const result = await disconnectSignInMethodAction(provider);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMethods(result.data);
      setMessage(`${formatProviderLabel(provider)} disconnected.`);
    } finally {
      setBusyProvider(null);
      setDisconnectTarget(null);
    }
  }

  async function submitSetPassword() {
    setBusyProvider("email");
    setMessage(null);
    try {
      const result = await setPasswordSignInMethodAction({
        password,
        confirmPassword,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      setMethods(result.data);
      setPassword("");
      setConfirmPassword("");
      setShowSetPassword(false);
      setMessage("Password set successfully.");
    } finally {
      setBusyProvider(null);
    }
  }

  return {
    methodRows,
    message,
    busyProvider,
    disconnectTarget,
    showSetPassword,
    password,
    confirmPassword,
    emailMethod,
    setDisconnectTarget,
    setShowSetPassword,
    setPassword,
    setConfirmPassword,
    submitSetPassword,
    submitDisconnect,
    startConnect,
  };
}
