import Link from "next/link";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Separator } from "@/shared/ui/shadcn/separator";
import { routes } from "@/shared/constants/routes";
import { PricingCheckoutButton } from "@/features/marketing/ui/pricing-checkout-button";

export default function PricingPage() {
  return (
    <div className="bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-sm font-extrabold tracking-tight">
            SaaS Template
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={routes.auth.login}>Login</Link>
            </Button>
            <Button asChild className="rounded-xl">
              <Link href={routes.auth.signup}>Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-14">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight">Pricing</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Simple pricing for a starter template. Upgrade to Pro to unlock billing, advanced team features, and future updates.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <PlanCard
            title="Free"
            price="$0"
            subtitle="Perfect to evaluate the foundation."
            items={[
              "Auth: password + magic link + reset",
              "Google OAuth",
              "Organizations + roles",
              "Team invites",
              "Sessions page",
              "ShadCN/Tailwind UI shell",
            ]}
            cta={
              <Button asChild variant="outline" className="w-full rounded-2xl">
                <Link href={routes.auth.signup}>Start free</Link>
              </Button>
            }
          />

          <PlanCard
            title="Pro"
            price="$99"
            subtitle="One-time template license (recommended)."
            highlight
            items={[
              "Everything in Free",
              "Stripe subscriptions: Checkout + Portal",
              "Webhook sync (subscription status)",
              "Billing dashboard page",
              "Better default UI polish",
              "Priority template updates (roadmap)",
            ]}
            cta={<PricingCheckoutButton />}
          />
        </div>

        <Separator className="my-12" />

        <section className="grid gap-6 md:grid-cols-3">
          <FAQ
            q="Self-host or Vercel?"
            a="Both. Local/dev works out of the box. Vercel is a natural fit, but the template stays portable."
          />
          <FAQ
            q="What do devs pay for?"
            a="Saved time + correct flows. Billing + orgs + auth are always the pain points. You sell certainty."
          />
          <FAQ
            q="Can I extend it?"
            a="Yes. The core logic lives in packages (auth/org/billing). Add your domain modules without rewriting auth/billing."
          />
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Button asChild className="rounded-2xl">
            <Link href={routes.auth.signup}>Get started</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href={routes.marketing.home}>Back home</Link>
          </Button>
        </div>
      </main>

      <footer className="py-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SaaS Template
      </footer>
    </div>
  );
}

function PlanCard(props: {
  title: string;
  price: string;
  subtitle: string;
  items: string[];
  cta: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={["rounded-3xl", props.highlight ? "border-foreground/40" : ""].join(" ")}>
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-baseline justify-between gap-3">
          <span className="text-xl font-extrabold">{props.title}</span>
          <span className="text-3xl font-extrabold">{props.price}</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{props.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <ul className="grid gap-2 text-sm text-muted-foreground">
          {props.items.map((x) => (
            <li key={x}>• {x}</li>
          ))}
        </ul>
        {props.cta}
        {props.highlight ? (
          <div className="text-xs text-muted-foreground">
            Uses your existing Stripe setup: it redirects to Checkout and syncs via webhooks.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FAQ(props: { q: string; a: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6">
        <div className="text-sm font-extrabold">{props.q}</div>
        <p className="mt-2 text-sm text-muted-foreground">{props.a}</p>
      </CardContent>
    </Card>
  );
}
