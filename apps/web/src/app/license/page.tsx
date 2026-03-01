import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";

export default function LicensePage() {
  return (
    <div className="bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-sm font-extrabold tracking-tight">
            SaaS Template
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/docs">Docs</Link>
            </Button>
            <Button asChild className="rounded-xl">
              <Link href="/pricing">Pricing</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight">License (EULA)</h1>
        <p className="mt-3 text-muted-foreground">
          Commercial terms for using this template in one SaaS product per license purchase.
        </p>

        <Card className="mt-8 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-extrabold">SaaS Template License Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-muted-foreground">
            <p>
              <b className="text-foreground">1) Grant.</b> Upon purchase, you receive a non-exclusive,
              worldwide license to use, modify, and incorporate the template into one (1) end product
              (your SaaS/app) per license purchase.
            </p>

            <p>
              <b className="text-foreground">2) Permitted use.</b> You may deploy the end product
              commercially (including for paying customers), self-host or hosted, with unlimited users
              of your end product.
            </p>

            <p>
              <b className="text-foreground">3) Prohibited use.</b> You may not resell, sublicense,
              redistribute, or make the template available as a template, boilerplate, starter kit,
              or source-code product (including “template bundles”) whether modified or not.
            </p>

            <p>
              <b className="text-foreground">4) Support.</b> Support, updates, and maintenance may be
              offered at the seller’s discretion and are not guaranteed unless explicitly purchased.
            </p>

            <p>
              <b className="text-foreground">5) Warranty disclaimer.</b> The template is provided “as is”
              without warranties of any kind. You are responsible for security review, compliance,
              and production readiness of your end product.
            </p>

            <p>
              <b className="text-foreground">6) Liability.</b> To the maximum extent permitted by law,
              the seller is not liable for any damages arising from use of the template.
            </p>

            <Separator />

            <p className="text-xs">Consult legal counsel for jurisdiction-specific compliance.</p>
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild className="rounded-2xl">
            <Link href="/pricing">View pricing</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href="/docs">Read docs</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
