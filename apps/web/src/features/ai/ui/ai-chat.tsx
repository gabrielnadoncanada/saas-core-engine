"use client";

import { useMemo, useState } from "react";

import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Input } from "@/shared/ui/shadcn/input";

type Msg = { role: "user" | "assistant"; content: string };
type ChatErrorResponse = { error?: string };

type SseEvent =
  | { type: "delta"; text: string }
  | { type: "usage"; inputTokens: number; outputTokens: number }
  | { type: "done" }
  | { type: "error"; message: string };

function parseSseEvent(raw: string): SseEvent | null {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") return null;

  const obj = parsed as Record<string, unknown>;
  if (obj["type"] === "delta" && typeof obj["text"] === "string") {
    return { type: "delta", text: obj["text"] };
  }
  if (
    obj["type"] === "usage" &&
    typeof obj["inputTokens"] === "number" &&
    typeof obj["outputTokens"] === "number"
  ) {
    return {
      type: "usage",
      inputTokens: obj["inputTokens"],
      outputTokens: obj["outputTokens"],
    };
  }
  if (obj["type"] === "done") return { type: "done" };
  if (obj["type"] === "error" && typeof obj["message"] === "string") {
    return { type: "error", message: obj["message"] };
  }

  return null;
}

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
      body: JSON.stringify({
        messages: next.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    const ct = res.headers.get("content-type") ?? "";
    if (!res.ok && ct.includes("application/json")) {
      const j = (await res.json()) as ChatErrorResponse;
      setBusy(false);
      setMessages([
        ...next,
        { role: "assistant", content: `Warning: ${j.error ?? "AI request failed"}` },
      ]);
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

    setMessages([...next, { role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;

        const data = parseSseEvent(line.slice(6));
        if (!data) continue;

        if (data.type === "delta") {
          assistant += data.text;
          setMessages((prev) => {
            const copy = prev.slice();
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") {
              copy[copy.length - 1] = { role: "assistant", content: assistant };
            }
            return copy;
          });
          continue;
        }

        if (data.type === "usage") {
          setUsage({ inputTokens: data.inputTokens, outputTokens: data.outputTokens });
          continue;
        }

        if (data.type === "error") {
          break;
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
          {usage
            ? `Usage: ${usage.inputTokens} in / ${usage.outputTokens} out (${totalTokens} total)`
            : "Usage: -"}
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
            placeholder="Ask something..."
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
          />
          <Button
            className="rounded-2xl"
            disabled={busy}
            onClick={() => {
              void send();
            }}
          >
            {busy ? "..." : "Send"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
