"use client";

import { useState } from "react";

function parseRole(value: string): "admin" | "member" {
  return value === "admin" ? "admin" : "member";
}

export function InviteMemberForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/org/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      if (!res.ok) throw new Error("Invite failed");

      setEmail("");
      setRole("member");
      setStatus("done");
    } catch {
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
          style={input}
        />
      </div>

      <div>
        <label style={label}>Role</label>
        <select value={role} onChange={(e) => setRole(parseRole(e.target.value))} style={input}>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <button type="submit" style={button} disabled={status === "loading"}>
        {status === "loading" ? "Sending..." : "Invite"}
      </button>

      {status === "done" && <span style={{ color: "green" }}>Sent ✅</span>}
      {status === "error" && <span style={{ color: "crimson" }}>Error</span>}
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
