"use client";

import { useMemo, useState } from "react";

import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Input } from "@/shared/ui/shadcn/input";

type Msg = { role: "user" | "assistant"; content: string };

export function AIChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<{ inputTokens: number; outputTokens: number } | null>(null);
  const totalTokens = useMemo(() => (usage ? usage.inputTokens + usage.outputTokens : 0), [usage]);

  async function send() {
    if (!input.trim() || busy) return;

    const next = [...messages, { role: "user" as const, content: input }];
    setMessages(next);
    setInput("");
    setUsage(null);
    setBusy(true);

    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
    });

    // Quota error (json)
    const ct = res.headers.get("content-type") ?? "";
    if (!res.ok && ct.includes("application/json")) {
      const j = await res.json();
      setBusy(false);
      setMessages([...next, { role: "assistant", content: `⚠️ ${j.error}` }]);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      setBusy(false);
      return;
    }

    const decoder = new TextDecoder();
    let assistant = "";
    let buffer = "";

    // add placeholder assistant message
    setMessages([...next, { role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // split on SSE message boundary
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;

        const data = JSON.parse(line.slice(6));

        if (data.type === "delta") {
          assistant += data.text;
          setMessages((prev) => {
            const copy = prev.slice();
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") copy[copy.length - 1] = { role: "assistant", content: assistant };
            return copy;
          });
        }

        if (data.type === "usage") {
          setUsage({ inputTokens: data.inputTokens, outputTokens: data.outputTokens });
        }

        if (data.type === "done") {
          // noop
        }
      }
    }

    setBusy(false);
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader className="space-y-2">
        <CardTitle className="text-sm font-extrabold">AI Chat (Demo)</CardTitle>
        <div className="text-xs text-muted-foreground">
          {usage ? `Usage: ${usage.inputTokens} in / ${usage.outputTokens} out (${totalTokens} total)` : "Usage: —"}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="h-80 overflow-auto rounded-2xl border p-3">
          {messages.map((m, i) => (
            <div key={i} className="mb-3">
              <div className="text-xs font-bold text-muted-foreground">{m.role.toUpperCase()}</div>
              <div className="text-sm">{m.content}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something…"
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
          />
          <Button className="rounded-2xl" disabled={busy} onClick={send}>
            {busy ? "…" : "Send"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
