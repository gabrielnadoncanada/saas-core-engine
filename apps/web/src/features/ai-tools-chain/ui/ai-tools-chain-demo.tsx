"use client";

import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { Textarea } from "@/shared/components/ui/textarea";

export function AIToolsChainDemo() {
  const [prompt, setPrompt] = useState(
    "Summarize my org details, show my subscription status, then list the last 5 users."
  );
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<any>(null);

  async function run() {
    setBusy(true);
    setOut(null);
    try {
      const res = await fetch("/api/ai/tools/chain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, maxSteps: 3 }),
      });
      const json = await res.json();
      setOut(json);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card className="rounded-3xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-sm font-extrabold">Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea className="min-h-[140px] rounded-2xl" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <Button className="rounded-2xl" disabled={busy} onClick={run}>
            {busy ? "Running…" : "Run chain"}
          </Button>
          {out?.ok ? (
            <div className="text-xs text-muted-foreground">
              {out.plan?.toUpperCase()} · {out.model} · steps {out.steps?.length ?? 0} · tokens{" "}
              {out.usage?.inputTokens}/{out.usage?.outputTokens} · ${Number(out.costUsd ?? 0).toFixed(3)}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="text-sm font-extrabold">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!out?.ok ? (
              <div className="text-sm text-muted-foreground">Run a chain to see the timeline.</div>
            ) : (
              out.steps.map((s: any) => (
                <div key={s.step} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">Step {s.step}</div>
                    <div className="text-xs text-muted-foreground">
                      ${Number(s.costUsd ?? 0).toFixed(3)} · {s.usage?.inputTokens}/{s.usage?.outputTokens}
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="text-xs font-bold text-muted-foreground">PICK</div>
                  <pre className="mt-1 whitespace-pre-wrap text-xs">{JSON.stringify(s.pick, null, 2)}</pre>

                  {s.tool ? (
                    <>
                      <Separator className="my-3" />
                      <div className="text-xs font-bold text-muted-foreground">TOOL</div>
                      <div className="mt-1 text-sm font-semibold">{s.tool.name}</div>
                      <div className="mt-2 text-xs font-bold text-muted-foreground">ARGS</div>
                      <pre className="mt-1 whitespace-pre-wrap text-xs">{JSON.stringify(s.tool.args, null, 2)}</pre>
                      <div className="mt-2 text-xs font-bold text-muted-foreground">RESULT</div>
                      <pre className="mt-1 whitespace-pre-wrap text-xs">
                        {JSON.stringify(s.tool.error ? { error: s.tool.error } : s.tool.result, null, 2)}
                      </pre>
                    </>
                  ) : null}

                  {s.assistant?.partialAnswer ? (
                    <>
                      <Separator className="my-3" />
                      <div className="text-xs font-bold text-muted-foreground">ANSWER</div>
                      <div className="mt-1 text-sm text-muted-foreground">{s.assistant.partialAnswer}</div>
                    </>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="text-sm font-extrabold">Final answer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[240px] whitespace-pre-wrap rounded-2xl border bg-muted p-4 text-sm">
              {out?.ok ? out.finalAnswer : "—"}
            </div>
            <Separator className="my-4" />
            <div className="text-xs text-muted-foreground">
              This is not a full agent framework. It’s a controlled, safe tool chaining loop (max 3 steps).
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="text-sm font-extrabold">Raw JSON</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-2xl border bg-muted p-4 text-xs">
            {out ? JSON.stringify(out, null, 2) : "—"}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
