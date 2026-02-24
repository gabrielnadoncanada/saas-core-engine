"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  currentEmail: string;
  emailVerified: boolean;
};

type ApiResult = {
  ok?: boolean;
  email?: string;
  error?: string;
};

export function ProfileEmailForm({ currentEmail, emailVerified }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(currentEmail);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSave() {
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail) {
      setMsg("Email is required.");
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/profile/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: nextEmail }),
      });

      const text = await res.text();
      const json = (text ? JSON.parse(text) : {}) as ApiResult;

      if (!res.ok) {
        if (json.error === "email_in_use") {
          setMsg("This email is already in use.");
          return;
        }
        if (json.error === "invalid_input") {
          setMsg("Enter a valid email address.");
          return;
        }
        if (json.error === "forbidden") {
          setMsg("Email cannot be changed while impersonating.");
          return;
        }
        setMsg("Failed to update email.");
        return;
      }

      setEmail(json.email ?? nextEmail);
      setMsg("Email updated.");
      router.refresh();
    } catch {
      setMsg("Failed to update email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div style={label}>Email</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          style={input}
        />
        <button
          type="button"
          onClick={() => {
            void onSave();
          }}
          disabled={busy || !email.trim()}
          style={button}
        >
          {busy ? "Saving..." : "Save email"}
        </button>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
        {emailVerified
          ? "Changing email resets verification status until re-verified."
          : "Email verification pending."}
      </div>
      {msg ? <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>{msg}</div> : null}
    </div>
  );
}

const label: React.CSSProperties = {
  fontSize: 12,
  color: "#666",
};

const input: React.CSSProperties = {
  width: "100%",
  maxWidth: 360,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
};

const button: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};
