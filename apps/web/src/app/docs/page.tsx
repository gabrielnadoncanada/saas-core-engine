import { DocCard, DocsLayout } from "@/features/docs/ui";

export default function DocsIndexPage() {
  return (
    <DocsLayout
      title="Documentation"
      subtitle="Everything you need to run, configure, and deploy the template."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <DocCard
          title="Getting started"
          desc="Install deps, sync schema, start dev server."
          href="/docs/getting-started"
        />
        <DocCard
          title="Configuration"
          desc="Environment variables for Resend, Google/GitHub OAuth, Stripe."
          href="/docs/configuration"
        />
        <DocCard
          title="Deploy"
          desc="Vercel + self-host guidance, webhook setup."
          href="/docs/deploy"
        />
        <DocCard
          title="License"
          desc="Template license terms (draft)."
          href="/license"
        />
      </div>

      <h2 className="mt-10 text-xl font-extrabold">What’s included</h2>
      <ul className="mt-3 text-muted-foreground">
        <li>Auth: password, reset, Google/GitHub OAuth</li>
        <li>Organizations: roles, invites, team page</li>
        <li>Security: session list + revoke</li>
        <li>Billing: Stripe Checkout + Portal + webhooks sync</li>
      </ul>
    </DocsLayout>
  );
}
