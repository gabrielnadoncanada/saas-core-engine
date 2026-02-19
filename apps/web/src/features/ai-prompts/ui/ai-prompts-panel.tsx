"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { Textarea } from "@/shared/components/ui/textarea";

type Version = { id: string; version: number; content: string; createdAt: string; createdById?: string | null };

export function AIPromptsPanel() {
  const [keys, setKeys] = useState<string[]>([]);
  const [key, setKey] = useState<string>("chat.system");
  const [activeVersion, setActiveVersion] = useState<number>(1);
  const [versions, setVersions] = useState<Version[]>([]);
  const [draft, setDraft] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function loadKeys() {
    const res = await fetch("/api/ai/prompts");
    const json = (await res.json());
    setKeys(json.keys ?? ["chat.system"]);
  }

  async function loadPrompt(k: string) {
    const url = new URL("/api/ai/prompts", window.location.origin);
    url.searchParams.set("key", k);

    const res = await fetch(url.toString());
    const json = (await res.json());

    setActiveVersion(json.activeVersion ?? 1);
    setVersions((json.versions ?? []) as Version[]);

    const active = (json.versions ?? []).find((v: Version) => v.version === (json.activeVersion ?? 1));
    setDraft(active?.content ?? "");
  }

  useEffect(() => {
    void loadKeys();
  }, []);

  useEffect(() => {
    void loadPrompt(key);
  }, [key]);

  const active = useMemo(() => versions.find((v) => v.version === activeVersion) ?? null, [versions, activeVersion]);

  async function saveNewVersion() {
    setBusy(true);
    try {
      const res = await fetch("/api/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, content: draft }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");

      await loadPrompt(key);
    } finally {
      setBusy(false);
    }
  }

  async function setActive(v: number) {
    setBusy(true);
    try {
      const res = await fetch("/api/ai/prompts/active", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, version: v }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      await loadPrompt(key);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="text-sm font-extrabold">Prompt keys</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {keys.map((k) => (
            <Button
              key={k}
              variant={k === key ? "default" : "outline"}
              className="justify-start rounded-2xl"
              onClick={() => setKey(k)}
            >
              {k}
            </Button>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6">
        <Card className="rounded-3xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-sm font-extrabold">{key}</CardTitle>
            <div className="text-xs text-muted-foreground">
              Active version: <b className="text-foreground">v{activeVersion}</b>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[220px] rounded-2xl"
            />

            <div className="flex flex-wrap gap-2">
              <Button className="rounded-2xl" onClick={saveNewVersion} disabled={busy}>
                {busy ? "Saving…" : "Save as new version"}
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => active && setDraft(active.content)}
                disabled={busy || !active}
              >
                Reset draft to active
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Creating a new version automatically sets it as active.
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-sm font-extrabold">Versions</CardTitle>
            <div className="text-xs text-muted-foreground">Click to activate (rollback).</div>
          </CardHeader>
          <CardContent className="space-y-3">
            {versions.map((v) => (
              <div key={v.id} className="rounded-2xl border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">
                    v{v.version}{" "}
                    {v.version === activeVersion ? (
                      <span className="text-xs text-muted-foreground">(active)</span>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    {v.version !== activeVersion ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => setActive(v.version)}
                        disabled={busy}
                      >
                        Activate
                      </Button>
                    ) : null}
                  </div>
                </div>

                <Separator className="my-3" />

                <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                  {truncate(v.content, 600)}
                </pre>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n) + "\n…";
}
