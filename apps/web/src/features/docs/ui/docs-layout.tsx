import Link from "next/link";

import { Separator } from "@/shared/ui/shadcn/separator";

export function DocsLayout(props: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-sm font-extrabold tracking-tight">
            SaaS Template
          </Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/docs" className="hover:text-foreground">Docs</Link>
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/license" className="hover:text-foreground">License</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-10 md:grid-cols-[260px_1fr]">
          <aside className="space-y-6">
            <Nav />
          </aside>

          <article className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight">{props.title}</h1>
            {props.subtitle ? (
              <p className="mt-2 text-muted-foreground">{props.subtitle}</p>
            ) : null}
            <Separator className="my-6" />
            <div className="prose prose-neutral max-w-none dark:prose-invert">
              {props.children}
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}

function Nav() {
  return (
    <nav className="grid gap-1 text-sm">
      <div className="text-[11px] font-bold uppercase text-muted-foreground">Docs</div>
      <Link className="rounded-xl px-3 py-2 hover:bg-muted" href="/docs">Overview</Link>
      <Link className="rounded-xl px-3 py-2 hover:bg-muted" href="/docs/getting-started">Getting started</Link>
      <Link className="rounded-xl px-3 py-2 hover:bg-muted" href="/docs/configuration">Configuration</Link>
      <Link className="rounded-xl px-3 py-2 hover:bg-muted" href="/docs/deploy">Deploy</Link>

      <div className="pt-5 text-[11px] font-bold uppercase text-muted-foreground">Reference</div>
      <Link className="rounded-xl px-3 py-2 hover:bg-muted" href="/license">License</Link>
    </nav>
  );
}
