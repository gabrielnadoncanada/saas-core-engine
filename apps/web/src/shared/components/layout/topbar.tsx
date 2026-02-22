"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { routes } from "@/shared/constants/routes";
import { OrgSwitcher } from "@/shared/components/layout/org-switcher";
import { Button } from "@/shared/components/ui/button";
import { ThemeToggle } from "@/shared/components/ThemeToggle";

export function Topbar(props: { title: string }) {
  const [me, setMe] = useState<{
    userId: string;
    organizationId: string;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/auth/me");
      const json = (await res.json()) as {
        user?: {
          userId: string;
          organizationId: string;
        } | null;
      };
      setMe(json.user ?? null);
    })();
  }, []);

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
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
            <Link href={routes.app.roles}>Roles</Link>
          </Button>
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
