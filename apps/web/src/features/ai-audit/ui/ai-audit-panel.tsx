"use client";

import { useEffect, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

type ToolExec = { step: number; toolName: string; durationMs: number; status: "ok" | "error"; errorMessage?: string | null };

type Row = {
  id: string;
  createdAt: string;
  status: "ok" | "error" | "blocked";
  errorCode?: string | null;
  errorMessage?: string | null;

  userEmail: string;
  model: string;
  plan: string;
  route: string;

  messageCount: number;
  promptChars: number;

  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  toolExecutions?: ToolExec[];
};



export function AIAuditPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string>(""); // "" | ok | error | blocked
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const url = new URL("/api/ai/audit", window.location.origin);
      if (status) url.searchParams.set("status", status);
      url.searchParams.set("limit", "50");

      const res = await fetch(url.toString());
      const json = (await res.json()) as { ok: boolean; rows: Row[] };
      setRows(json.ok ? json.rows : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [status]);

  return (
    <div className="grid gap-6">
      <Card className="rounded-3xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-sm font-extrabold">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <FilterButton active={status === ""} onClick={() => setStatus("")}>All</FilterButton>
          <FilterButton active={status === "ok"} onClick={() => setStatus("ok")}>OK</FilterButton>
          <FilterButton active={status === "blocked"} onClick={() => setStatus("blocked")}>Blocked</FilterButton>
          <FilterButton active={status === "error"} onClick={() => setStatus("error")}>Error</FilterButton>

          <div className="ml-auto">
            <Button variant="outline" className="rounded-2xl" onClick={() => { void load(); }} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-sm font-extrabold">Latest events</CardTitle>
          <div className="text-xs text-muted-foreground">
            Showing {rows.length} events (most recent first)
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 pr-4">Model</th>
                  <th className="py-2 pr-4">Msgs</th>
                  <th className="py-2 pr-4">Tokens</th>
                  <th className="py-2 pr-4">Cost</th>
                  <th className="py-2 pr-0">Error</th>
                  <th className="py-2 pr-4">Tools</th>
                  <th className="py-2 pr-4">Tool ms</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={badgeClass(r.status)}>{r.status.toUpperCase()}</span>
                    </td>
                    <td className="py-2 pr-4">{r.userEmail}</td>
                    <td className="py-2 pr-4">{r.plan}</td>
                    <td className="py-2 pr-4">{r.model}</td>
                    <td className="py-2 pr-4">{r.messageCount}</td>
                    <td className="py-2 pr-4">{fmtInt(r.inputTokens + r.outputTokens)}</td>
                    <td className="py-2 pr-4">${r.costUsd.toFixed(3)}</td>
                    <td className="py-2 pr-0">
                      {r.status === "ok" ? "—" : `${r.errorCode ?? ""}${r.errorMessage ? `: ${r.errorMessage}` : ""}`}
                    </td>
                    <td className="py-2 pr-4">
                      {r.toolExecutions?.length
                        ? r.toolExecutions.map((t) => `${t.toolName}${t.status === "error" ? "(!)" : ""}`).join(", ")
                        : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {r.toolExecutions?.length
                        ? `${r.toolExecutions.reduce((sum, t) => sum + (t.durationMs ?? 0), 0)}ms`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length === 0 ? (
            <div className="pt-4 text-sm text-muted-foreground">No events yet.</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterButton(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant={props.active ? "default" : "outline"}
      className="rounded-2xl"
      onClick={props.onClick}
    >
      {props.children}
    </Button>
  );
}

function badgeClass(status: string) {
  const base = "inline-flex rounded-full border px-2 py-1 text-xs font-bold";
  if (status === "ok") return `${base} bg-muted`;
  if (status === "blocked") return `${base} bg-muted`;
  return `${base} bg-muted`;
}

function fmtInt(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}
