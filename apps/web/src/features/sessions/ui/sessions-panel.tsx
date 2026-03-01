"use client";

import { useEffect, useMemo, useState } from "react";

import {
  listSessionsAction,
  revokeAllSessionsAction,
  revokeSessionAction,
} from "@/features/sessions/api/sessions.action";

type SessionRow = {
  id: string;
  createdAt: string;
  lastSeenAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  userAgent: string | null;
  ip: string | null;
};

export function SessionsPanel() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const result = await listSessionsAction();
      setSessions(result.ok ? result.data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const rows = useMemo(() => {
    return sessions.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [sessions]);

  async function revoke(sessionId: string) {
    setBusy(sessionId);
    try {
      await revokeSessionAction({ sessionId });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function revokeAll() {
    setBusy("ALL");
    try {
      await revokeAllSessionsAction();
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div style={{ color: "#666" }}>Loading sessions…</div>;

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 600 }}>Active sessions</div>
        <button
          onClick={() => {
            void revokeAll();
          }}
          disabled={busy !== null}
          style={btnDanger}
        >
          {busy === "ALL" ? "Revoking…" : "Revoke all"}
        </button>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 12, color: "#666" }}>No active sessions.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Created</th>
                <th style={th}>Last seen</th>
                <th style={th}>Expires</th>
                <th style={th}>IP</th>
                <th style={th}>User Agent</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td style={td}>{new Date(s.createdAt).toLocaleString()}</td>
                  <td style={td}>{s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString() : "-"}</td>
                  <td style={td}>{new Date(s.expiresAt).toLocaleString()}</td>
                  <td style={td}>{s.ip ?? "—"}</td>
                  <td style={{ ...td, maxWidth: 420 }}>
                    <span style={{ display: "inline-block", maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.userAgent ?? "—"}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <button
                      onClick={() => {
                        void revoke(s.id);
                      }}
                      disabled={busy !== null}
                      style={btnGhost}
                    >
                      {busy === s.id ? "Revoking…" : "Revoke"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderTop: "1px solid #eee",
  borderBottom: "1px solid #eee",
  fontSize: 12,
  color: "#666",
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #f3f3f3",
  fontSize: 14,
};

const btnGhost: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "transparent",
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #7f1d1d",
  background: "#991b1b",
  color: "#fff",
  cursor: "pointer",
};
