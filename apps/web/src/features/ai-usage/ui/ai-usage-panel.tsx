"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Button } from "@/shared/ui/shadcn/button";
import Link from "next/link";
import { routes } from "@/shared/constants/routes";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

type DailyPoint = { day: string; tokens: number; costUsd: number };

type UserRow = {
  userId: string;
  email: string;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

type ApiResponse = {
  ok: boolean;
  plan: "free" | "pro" | string;
  quota: number;
  monthly: { inputTokens: number; outputTokens: number; totalTokens: number; costUsd: number };
  daily: DailyPoint[];
  users: UserRow[];
};

export function AIUsagePanel() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/ai/usage");
        const json = (await res.json()) as ApiResponse;
        setData(json.ok ? json : null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pct = useMemo(() => {
    if (!data) return 0;
    return Math.min(100, Math.round((data.monthly.totalTokens / Math.max(1, data.quota)) * 100));
  }, [data]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!data) return <div className="text-sm text-muted-foreground">No data.</div>;

  const isFree = data.plan === "free";

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Kpi title="Plan" value={data.plan.toUpperCase()} hint={`Quota: ${fmtInt(data.quota)} tokens/month`} />
        <Kpi title="Tokens used" value={fmtInt(data.monthly.totalTokens)} hint={`${pct}% of quota`} />
        <Kpi title="Cost (est.)" value={`$${data.monthly.costUsd.toFixed(2)}`} hint="Based on model pricing table" />
      </div>

      <Card className="rounded-3xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-sm font-extrabold">Quota</CardTitle>
          <div className="text-xs text-muted-foreground">
            {fmtInt(data.monthly.totalTokens)} / {fmtInt(data.quota)} tokens used ({pct}%)
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-3 w-full rounded-full bg-muted">
            <div
              className="h-3 rounded-full bg-foreground"
              style={{ width: `${pct}%` }}
            />
          </div>

          {isFree && pct >= 80 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
              <div>
                <div className="text-sm font-semibold">You’re close to your Free quota.</div>
                <div className="text-xs text-muted-foreground">Upgrade to Pro for higher limits and better models.</div>
              </div>
              <Button asChild className="rounded-2xl">
                <Link href={routes.app.billing}>Upgrade</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-sm font-extrabold">Tokens over time</CardTitle>
            <div className="text-xs text-muted-foreground">Current month</div>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.daily}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={40} />
                <Tooltip />
                <Area dataKey="tokens" strokeWidth={2} fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-sm font-extrabold">Cost over time</CardTitle>
            <div className="text-xs text-muted-foreground">Current month</div>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.daily}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={40} />
                <Tooltip />
                <Area dataKey="costUsd" strokeWidth={2} fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-sm font-extrabold">By user</CardTitle>
          <div className="text-xs text-muted-foreground">Top users this month</div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Tokens</th>
                  <th className="py-2 pr-4">Input</th>
                  <th className="py-2 pr-4">Output</th>
                  <th className="py-2 pr-0">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.userId} className="border-b last:border-b-0">
                    <td className="py-2 pr-4">{u.email}</td>
                    <td className="py-2 pr-4">{fmtInt(u.tokens)}</td>
                    <td className="py-2 pr-4">{fmtInt(u.inputTokens)}</td>
                    <td className="py-2 pr-4">{fmtInt(u.outputTokens)}</td>
                    <td className="py-2 pr-0">${u.costUsd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            Tip: enforce per-user limits later if you sell “seats” or want internal fairness.
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href={routes.app.dashboard}>Back to dashboard</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href={routes.app.sessions}>Sessions</Link>
        </Button>
      </div>
    </div>
  );
}

function Kpi(props: { title: string; value: string; hint: string }) {
  return (
    <Card className="rounded-3xl">
      <CardContent className="p-6">
        <div className="text-xs text-muted-foreground">{props.title}</div>
        <div className="mt-2 text-2xl font-extrabold">{props.value}</div>
        <div className="mt-2 text-xs text-muted-foreground">{props.hint}</div>
      </CardContent>
    </Card>
  );
}

function fmtInt(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}
