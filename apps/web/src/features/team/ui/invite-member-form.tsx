"use client";

import type { InviteRole } from "@contracts";
import { useState } from "react";

function parseRole(value: string): InviteRole {
  if (value === "super_admin") return "super_admin";
  if (value === "admin") return "admin";
  return "member";
}

export function InviteMemberForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("member");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Email is required");
      setStatus("error");
      return;
    }

    setErrorMessage("");
    setStatus("loading");

    try {
      const res = await fetch("/api/org/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, role }),
      });

      const text = await res.text();
      let errorFromApi: string | undefined;
      if (text) {
        try {
          errorFromApi = (JSON.parse(text) as { error?: string }).error;
        } catch {
          // Ignore non-JSON responses and fall back to a generic message.
        }
      }
      if (!res.ok) throw new Error(errorFromApi ?? "Invite failed");

      setEmail("");
      setRole("member");
      setStatus("done");
      setErrorMessage("");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Invite failed");
      setStatus("error");
    }
  }

  return (
    <form
      onSubmit={(e) => {
        void onSubmit(e);
      }}
      style={{ display: "flex", gap: 12, alignItems: "flex-end" }}
    >
      <div style={{ flex: 1 }}>
        <label style={label}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          type="email"
          autoComplete="email"
          style={input}
        />
      </div>

      <div>
        <label style={label}>Role</label>
        <select value={role} onChange={(e) => setRole(parseRole(e.target.value))} style={input}>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super admin</option>
        </select>
      </div>

      <button type="submit" style={button} disabled={status === "loading" || !email.trim()}>
        {status === "loading" ? "Sending..." : "Invite"}
      </button>

      {status === "done" && <span style={{ color: "green" }}>Sent ✅</span>}
      {status === "error" && <span style={{ color: "crimson" }}>{errorMessage || "Error"}</span>}
    </form>
  );
}

const label: React.CSSProperties = { display: "block", fontSize: 12, color: "#666", marginBottom: 6 };

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  outline: "none",
};

const button: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};
