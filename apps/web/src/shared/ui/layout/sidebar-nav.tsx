"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Button } from "@/shared/ui/shadcn/button";
import { routes } from "@/shared/constants/routes";

type NavItem = { href: string; label: string };

const sections: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Workspace",
    items: [
      { href: routes.app.dashboard, label: "Overview" },
      { href: routes.app.billing, label: "Billing" },
      { href: routes.app.team, label: "Team" },
    ],
  },
  {
    title: "Account",
    items: [
      { href: routes.app.sessions, label: "Sessions" },
      { href: routes.app.settings, label: "Settings" },
      { href: routes.app.aiUsage, label: "AI Usage" },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <div className="text-sm font-extrabold tracking-tight">SaaS Template</div>
        <Badge variant="secondary">PRO</Badge>
      </div>

      <Separator className="my-4" />

      <nav className="grid gap-5">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="text-[11px] font-bold uppercase text-muted-foreground">
              {section.title}
            </div>

            <div className="mt-2 grid gap-1">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== routes.app.dashboard && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "rounded-xl px-3 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-foreground/90 hover:bg-muted",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto pt-4">
        <Separator className="mb-4" />
        <LogoutButton />
      </div>
    </div>
  );
}

function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = routes.auth.login;
  }

  return (
    <Button variant="outline" className="w-full rounded-xl" onClick={logout}>
      Logout
    </Button>
  );
}
