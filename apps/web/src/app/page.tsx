import Link from "next/link";

import { routes } from "@/shared/constants/routes";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";

export default function HomePage() {
  return (
    <div className="bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4">
        <section className="py-16">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">
                Next.js + Prisma + Auth + Orgs + Stripe
              </p>

              <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">
                Ship a SaaS in days, not weeks.
              </h1>

              <p className="mt-4 text-lg text-muted-foreground">
                A production-ready starter with authentication (password, Google/GitHub OAuth),
                organizations & invites, sessions/security, and Stripe subscriptions with webhooks.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="rounded-2xl">
                  <Link href={routes.auth.signup}>Get started</Link>
                </Button>

                <Button asChild variant="outline" className="rounded-2xl">
                  <Link href={routes.marketing.pricing}>View pricing</Link>
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Chip>Self-host friendly</Chip>
                <Chip>Vercel-ready</Chip>
                <Chip>Clean architecture</Chip>
                <Chip>Extensible modules</Chip>
              </div>
            </div>

            <Card className="rounded-3xl">
              <CardContent className="p-6">
                <div className="grid gap-4">
                  <div className="text-sm font-semibold">What’s inside</div>
                  <FeatureRow title="Auth" desc="Password, Google/GitHub OAuth, reset password." />
                  <FeatureRow title="Workspace" desc="Organizations, roles, team invites, members." />
                  <FeatureRow title="Security" desc="Sessions list + revoke all, reset password." />
                  <FeatureRow title="Billing" desc="Stripe Checkout + Portal + webhook sync." />
                  <Separator />
                  <div className="text-xs text-muted-foreground">
                    Opinionated defaults, minimal lock-in. Designed to be sold as a developer template.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        <section className="py-16">
          <h2 className="text-2xl font-extrabold tracking-tight">Built for speed & scale</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            You’re not buying “components”. You’re buying a coherent foundation with real flows already solved.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <InfoCard
              title="Production flows"
              desc="Signup → org → session cookie. OAuth linking. Invite acceptance with email match."
            />
            <InfoCard
              title="Stripe done right"
              desc="Checkout & Portal + idempotent-ish webhook sync to Subscription table."
            />
            <InfoCard
              title="Clean boundaries"
              desc="Core logic in packages (auth/org/billing). App adapters in Next routes."
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href={routes.app.dashboard}>See dashboard</Link>
            </Button>
            <Button asChild className="rounded-2xl">
              <Link href={routes.marketing.pricing}>Pricing & license</Link>
            </Button>
          </div>
        </section>

        <Separator />

        <section className="py-16">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-xl font-extrabold tracking-tight">Perfect for devs who want to ship</h3>
              <p className="mt-2 text-muted-foreground">
                It’s structured like a real product: auth, team, billing, settings, sessions. Add your domain
                features on top without refactoring the foundation.
              </p>

              <ul className="mt-6 grid gap-2 text-sm text-muted-foreground">
                <li>• App shell + navigation (ShadCN/Tailwind)</li>
                <li>• Email via Resend (required in production)</li>
                <li>• Prisma schema ready for multi-tenant</li>
                <li>• Works self-hosted or Vercel</li>
              </ul>
            </div>

            <Card className="rounded-3xl">
              <CardContent className="p-6">
                <div className="text-sm font-semibold">Quick start</div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <CodeLine>pnpm i</CodeLine>
                  <CodeLine>pnpm --filter ./packages/db exec prisma migrate deploy</CodeLine>
                  <CodeLine>pnpm dev</CodeLine>
                </div>
                <div className="mt-6 flex gap-3">
                  <Button asChild className="rounded-2xl">
                    <Link href={routes.auth.signup}>Create account</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-2xl">
                    <Link href={routes.auth.login}>Sign in</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <footer className="py-10 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} SaaS Template — Built with Next.js, Prisma & Stripe
        </footer>
      </main>
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-sm font-extrabold tracking-tight">
          SaaS Template
        </Link>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="rounded-xl">
            <Link href={routes.marketing.pricing}>Pricing</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={routes.auth.login}>Login</Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link href={routes.auth.signup}>Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Chip(props: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border px-3 py-1">
      {props.children}
    </span>
  );
}

function FeatureRow(props: { title: string; desc: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-sm font-semibold">{props.title}</div>
      <div className="text-right text-sm text-muted-foreground">{props.desc}</div>
    </div>
  );
}

function InfoCard(props: { title: string; desc: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6">
        <div className="text-sm font-extrabold">{props.title}</div>
        <p className="mt-2 text-sm text-muted-foreground">{props.desc}</p>
      </CardContent>
    </Card>
  );
}

function CodeLine(props: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-muted px-3 py-2 font-mono text-xs">
      {props.children}
    </div>
  );
}
