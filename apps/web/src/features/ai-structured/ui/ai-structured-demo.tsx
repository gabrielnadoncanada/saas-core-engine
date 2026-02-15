"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Button } from "@/shared/ui/shadcn/button";
import { Textarea } from "@/shared/ui/shadcn/textarea";
import { Separator } from "@/shared/ui/shadcn/separator";

type Kind = "invoice_items" | "contact";

export function AIStructuredDemo() {
  const [kind, setKind] = useState<Kind>("invoice_items");
  const [text, setText] = useState(sampleInvoice);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [meta, setMeta] = useState<{ model?: string; plan?: string; usage?: any; costUsd?: number } | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    setMeta(null);

    try {
      const res = await fetch("/api/ai/structured", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, text }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setResult({ error: json.error ?? "Failed" });
        return;
      }

      setResult(json.data);
      setMeta({ model: json.model, plan: json.plan, usage: json.usage, costUsd: json.costUsd });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="rounded-3xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-sm font-extrabold">Input</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={kind === "invoice_items" ? "default" : "outline"}
              className="rounded-2xl"
              onClick={() => {
                setKind("invoice_items");
                setText(sampleInvoice);
              }}
            >
              Invoice items
            </Button>
            <Button
              variant={kind === "contact" ? "default" : "outline"}
              className="rounded-2xl"
              onClick={() => {
                setKind("contact");
                setText(sampleContact);
              }}
            >
              Contact
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[320px] rounded-2xl" />
          <Button className="rounded-2xl" onClick={run} disabled={busy}>
            {busy ? "Running…" : "Generate JSON"}
          </Button>
          {meta ? (
            <div className="text-xs text-muted-foreground">
              {meta.plan?.toUpperCase()} · {meta.model} · tokens {meta.usage?.inputTokens}/{meta.usage?.outputTokens} · $
              {meta.costUsd?.toFixed(3)}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-sm font-extrabold">Output</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="min-h-[420px] whitespace-pre-wrap rounded-2xl border bg-muted p-4 text-xs">
            {result ? JSON.stringify(result, null, 2) : "—"}
          </pre>
          <Separator className="my-4" />
          <div className="text-xs text-muted-foreground">
            Output is schema-validated on the server (Zod). If the model returns invalid JSON, the request fails.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const sampleInvoice = `Invoice #1042
Acme Supplies
- Design work (5 hours) @ $120/hr
- Hosting - February @ $25
- Domain renewal @ $14.99
Currency: USD`;

const sampleContact = `Hey — I'm Marc-Andree Tremblay.
Email: marc@example.com
Phone: +1 (514) 555-0199
Company: NorthBuild Inc.`;
