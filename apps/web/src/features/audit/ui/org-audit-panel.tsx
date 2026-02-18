"use client";

import { useEffect, useMemo, useState } from "react";

type AuditRow = {
  id: string;
  createdAt: string;
  actorUserId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  outcome: string;
  ip: string | null;
  userAgent: string | null;
  traceId: string | null;
};

export function OrgAuditPanel() {
  const [action, setAction] = useState("");
  const [outcome, setOutcome] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "25");
    if (action) params.set("action", action);
    if (outcome) params.set("outcome", outcome);
    return params.toString();
  }, [action, outcome, page]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/org/audit?${query}`);
        const json = (await res.json()) as {
          rows?: AuditRow[];
          totalPages?: number;
        };
        setRows(json.rows ?? []);
        setTotalPages(json.totalPages ?? 1);
      } finally {
        setLoading(false);
      }
    })();
  }, [query]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          border: "1px solid #e9e9e9",
          borderRadius: 12,
          padding: 12,
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          value={action}
          onChange={(event) => {
            setPage(1);
            setAction(event.target.value);
          }}
          placeholder="Filter action (ex: org.impersonation.started)"
          style={input}
        />
        <select
          value={outcome}
          onChange={(event) => {
            setPage(1);
            setOutcome(event.target.value);
          }}
          style={input}
        >
          <option value="">All outcomes</option>
          <option value="success">success</option>
          <option value="forbidden">forbidden</option>
          <option value="error">error</option>
        </select>
        <a href={`/api/org/audit?${query}&format=json`} style={btnGhost}>
          Export JSON
        </a>
        <a href={`/api/org/audit?${query}&format=csv`} style={btnGhost}>
          Export CSV
        </a>
      </div>

      <div style={{ border: "1px solid #e9e9e9", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Date</th>
              <th style={th}>Actor</th>
              <th style={th}>Action</th>
              <th style={th}>Target</th>
              <th style={th}>Outcome</th>
              <th style={th}>IP</th>
              <th style={th}>Trace</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td style={td} colSpan={7}>
                  {loading ? "Loading..." : "No audit events found."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td style={td}>{new Date(row.createdAt).toLocaleString()}</td>
                  <td style={td}>{row.actorUserId ?? "system"}</td>
                  <td style={td}>{row.action}</td>
                  <td style={td}>
                    {row.targetType ?? "-"} / {row.targetId ?? "-"}
                  </td>
                  <td style={td}>{row.outcome}</td>
                  <td style={td}>{row.ip ?? "-"}</td>
                  <td style={td}>{row.traceId ? row.traceId.slice(0, 12) : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          style={btnGhost}
          onClick={() => setPage((v) => Math.max(1, v - 1))}
          disabled={page <= 1}
        >
          Previous
        </button>
        <div style={{ alignSelf: "center", fontSize: 13 }}>
          Page {page} / {totalPages}
        </div>
        <button
          style={btnGhost}
          onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

const input: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 14,
};

const btnGhost: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: "8px 10px",
  background: "#fff",
  color: "#111",
  textDecoration: "none",
  cursor: "pointer",
  fontSize: 13,
};

const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  color: "#666",
  borderBottom: "1px solid #eee",
  padding: "10px 8px",
};

const td: React.CSSProperties = {
  borderBottom: "1px solid #f4f4f4",
  padding: "10px 8px",
  fontSize: 13,
};
