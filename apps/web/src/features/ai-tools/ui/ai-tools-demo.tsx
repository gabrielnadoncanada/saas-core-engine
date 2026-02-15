"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Button } from "@/shared/ui/shadcn/button";
import { Textarea } from "@/shared/ui/shadcn/textarea";
import { Separator } from "@/shared/ui/shadcn/separator";

export function AIToolsDemo() {
  const [prompt, setPrompt] = useState("Show my organization plan and list the last 5 users.");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<any>(null);

  async function run() {
    setBusy(true);
    setOut(null);
    try {
      const res = await fetch("/api/ai/tools", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json();
      setOut(json);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="text-sm font-extrabold">Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea className="min-h-[220px] rounded-2xl" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <Button className="rounded-2xl" disabled={busy} onClick={run}>
            {busy ? "Running…" : "Run tool call"}
          </Button>
          <div className="text-xs text-muted-foreground">
            Try: “What’s my subscription status?” / “List organization info” / “List users”
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-sm font-extrabold">Output</CardTitle>
          {out?.ok ? (
            <div className="text-xs text-muted-foreground">
              {out.plan?.toUpperCase()} · {out.model} · tool <b className="text-foreground">{out.tool}</b> · $
              {Number(out.costUsd ?? 0).toFixed(3)}
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          <pre className="min-h-[280px] whitespace-pre-wrap rounded-2xl border bg-muted p-4 text-xs">
            {out ? JSON.stringify(out, null, 2) : "—"}
          </pre>
          <Separator className="my-4" />
          <div className="text-sm font-semibold">Assistant answer</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {out?.answer ?? "—"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
