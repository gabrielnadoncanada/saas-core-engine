"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { routes } from "@/shared/constants/routes";
import { OrgSwitcher } from "@/shared/ui/layout/org-switcher";
import { Button } from "@/shared/ui/shadcn/button";
import { ThemeToggle } from "@/shared/ui/theme/theme-toggle";

export function Topbar(props: { title: string }) {
  const [me, setMe] = useState<{
    userId: string;
    organizationId: string;
    isImpersonating?: boolean;
    impersonation?: {
      actorUserId: string;
      targetUserId: string;
    };
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/auth/me");
      const json = (await res.json()) as {
        user?: {
          userId: string;
          organizationId: string;
          isImpersonating?: boolean;
          impersonation?: {
            actorUserId: string;
            targetUserId: string;
          };
        } | null;
      };
      setMe(json.user ?? null);
    })();
  }, []);

  async function stopImpersonation() {
    await fetch("/api/org/impersonation/stop", { method: "POST" });
    window.location.reload();
  }

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      {me?.isImpersonating ? (
        <div className="flex items-center justify-between border-b border-amber-300 bg-amber-100 px-4 py-2 text-xs text-amber-900">
          <span>
            Impersonation active: actor {me.impersonation?.actorUserId.slice(0, 8)}... as{" "}
            {me.impersonation?.targetUserId.slice(0, 8)}...
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void stopImpersonation();
            }}
          >
            Stop
          </Button>
        </div>
      ) : null}
      <div className="flex h-14 items-center justify-between px-4">
        <div className="min-w-0">
          <div className="text-sm font-extrabold">{props.title}</div>
          <div className="truncate text-xs text-muted-foreground">
            {me ? `User ${me.userId.slice(0, 8)}…` : "Not signed in"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <OrgSwitcher />
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={routes.app.team}>Invite</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={routes.app.billing}>Billing</Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
