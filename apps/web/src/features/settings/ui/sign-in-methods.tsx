"use client";

import { useMemo, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

type SignInMethod = {
  provider: "email" | "google" | "github";
  label: string;
  connected: boolean;
  linkedIdentifier?: string;
  lastUsedAt?: string;
  action: "connect" | "manage" | "disconnect";
  canDisconnect: boolean;
};

type MethodsApiResponse = {
  ok: boolean;
  methods?: SignInMethod[];
  error?: string;
};

type Props = {
  initialMethods: SignInMethod[];
  flashError?: string | null;
  flashSuccess?: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  oauth_cancelled: "OAuth flow was cancelled. No changes were saved.",
  oauth_failed: "OAuth failed. Please try again.",
  oauth_invalid: "OAuth response is invalid.",
  identity_already_linked: "This identity is already linked to another account.",
  must_add_another_method_first: "You must add another sign-in method first.",
  reauth_required: "Please re-authenticate to continue.",
};

const SUCCESS_MESSAGES: Record<string, string> = {
  google_connected: "Google connected successfully.",
  github_connected: "GitHub connected successfully.",
};

function formatLastUsed(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function SignInMethods({ initialMethods, flashError, flashSuccess }: Props) {
  const [methods, setMethods] = useState<SignInMethod[]>(initialMethods);
  const [message, setMessage] = useState<string | null>(() => {
    if (flashSuccess) return SUCCESS_MESSAGES[flashSuccess] ?? flashSuccess;
    if (flashError) return ERROR_MESSAGES[flashError] ?? flashError;
    return null;
  });
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<SignInMethod | null>(null);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const emailMethod = useMemo(
    () => methods.find((method) => method.provider === "email"),
    [methods],
  );

  async function refreshMethods() {
    const res = await fetch("/api/auth/sign-in-methods", { method: "GET" });
    const json = (await res.json()) as MethodsApiResponse;
    if (!res.ok || !json.ok || !json.methods) {
      throw new Error(json.error ?? "Failed to load methods.");
    }
    setMethods(json.methods);
  }

  function startConnect(provider: "google" | "github") {
    const redirect = `/dashboard/settings?oauth_intent=link&oauth_provider=${provider}`;
    window.location.href = `/api/auth/oauth/${provider}/start?redirect=${encodeURIComponent(redirect)}`;
  }

  async function disconnectProvider(provider: "google" | "github") {
    setBusyProvider(provider);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/sign-in-methods/disconnect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        if (json.error === "must_add_another_method_first") {
          setMessage("You must add another sign-in method first.");
          return;
        }
        setMessage("Failed to disconnect provider.");
        return;
      }
      await refreshMethods();
      setMessage(`${provider === "google" ? "Google" : "GitHub"} disconnected.`);
    } catch {
      setMessage("Failed to disconnect provider.");
    } finally {
      setBusyProvider(null);
      setDisconnectTarget(null);
    }
  }

  async function submitSetPassword() {
    setBusyProvider("email");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/password/set", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        if (json.error === "invalid_input") {
          setMessage("Password does not meet minimum requirements.");
          return;
        }
        if (json.error === "password_already_set") {
          setMessage("Password is already set for this account.");
          await refreshMethods();
          return;
        }
        if (json.error === "reauth_required") {
          setMessage("Please re-authenticate to continue.");
          return;
        }
        setMessage("Failed to set password.");
        return;
      }
      setPasswordValue("");
      setConfirmPassword("");
      setShowSetPassword(false);
      await refreshMethods();
      setMessage("Password set successfully.");
    } catch {
      setMessage("Failed to set password.");
    } finally {
      setBusyProvider(null);
    }
  }

  return (
    <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
      {methods.map((method) => {
        const lastUsed = formatLastUsed(method.lastUsedAt);
        const status = method.connected ? "Connected" : "Not connected";
        const isBusy = busyProvider === method.provider;

        return (
          <div key={method.provider} style={row}>
            <div style={{ minWidth: 180 }}>
              <div style={{ fontWeight: 700 }}>{method.label}</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{status}</div>
              {method.linkedIdentifier ? (
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                  {method.linkedIdentifier}
                </div>
              ) : null}
              {lastUsed ? (
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                  Last used {lastUsed}
                </div>
              ) : null}
            </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              {method.action === "connect" && (method.provider === "google" || method.provider === "github") ? (
                <button
                  type="button"
                  onClick={() => {
                    const provider = method.provider;
                    if (provider === "google" || provider === "github") {
                      startConnect(provider);
                    }
                  }}
                  disabled={isBusy}
                  style={btnPrimary}
                >
                  {isBusy ? "Connecting..." : "Connect"}
                </button>
              ) : null}

              {method.action === "manage" && method.provider === "email" ? (
                <button
                  type="button"
                  onClick={() => setShowSetPassword((value) => !value)}
                  disabled={isBusy}
                  style={btnSecondary}
                >
                  Manage
                </button>
              ) : null}

              {method.action === "disconnect" && (method.provider === "google" || method.provider === "github") ? (
                <button
                  type="button"
                  onClick={() => setDisconnectTarget(method)}
                  disabled={isBusy || !method.canDisconnect}
                  style={btnDanger}
                >
                  Disconnect
                </button>
              ) : null}
            </div>
          </div>
        );
      })}

      {emailMethod && !emailMethod.connected && showSetPassword ? (
        <div style={setPasswordCard}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Set password</div>
          <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(event) => setPasswordValue(event.target.value)}
              style={input}
              autoComplete="new-password"
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              style={input}
              autoComplete="new-password"
            />
            <div style={{ fontSize: 12, color: "#666" }}>
              Minimum 8 characters. Common weak passwords are blocked.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  void submitSetPassword();
                }}
                disabled={busyProvider === "email"}
                style={btnPrimary}
              >
                {busyProvider === "email" ? "Saving..." : "Set password"}
              </button>
              <button
                type="button"
                onClick={() => setShowSetPassword(false)}
                disabled={busyProvider === "email"}
                style={btnSecondary}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {message ? <div style={{ fontSize: 12, color: "#666" }}>{message}</div> : null}

      <AlertDialog open={Boolean(disconnectTarget)} onOpenChange={(open) => !open && setDisconnectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Disconnect {disconnectTarget?.label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Disconnect {disconnectTarget?.label}? You may lose access if it&apos;s your only sign-in method.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (disconnectTarget?.provider === "google" || disconnectTarget?.provider === "github") {
                  void disconnectProvider(disconnectTarget.provider);
                }
              }}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const row: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 12,
  display: "flex",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const setPasswordCard: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 12,
};

const input: React.CSSProperties = {
  width: "100%",
  maxWidth: 360,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  color: "#111",
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #7f1d1d",
  background: "#991b1b",
  color: "#fff",
  cursor: "pointer",
};
