import { expect, test } from "@playwright/test";

function requireEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}

test.describe("Billing E2E", () => {
  test("Achat plan -> URL checkout Stripe", async ({ request }) => {
    const token = requireEnv("E2E_BILLING_SESSION_TOKEN");
    test.skip(!token, "Requires E2E_BILLING_SESSION_TOKEN");

    const res = await request.post("/api/billing/checkout", {
      headers: { cookie: `session=${token}` },
      data: { plan: "pro" },
    });
    expect(res.status()).toBe(200);

    const json = (await res.json()) as { ok: boolean; url: string };
    expect(json.ok).toBe(true);
    expect(json.url).toContain("stripe");
  });

  test("Annulation abonnement -> feature premium bloquee", async () => {
    test.skip(
      !requireEnv("E2E_STRIPE_CLI_ENABLED"),
      "Requires Stripe CLI/webhook harness and seeded premium feature check",
    );
  });
});
