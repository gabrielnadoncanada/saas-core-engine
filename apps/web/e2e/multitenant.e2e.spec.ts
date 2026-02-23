import { expect, test } from "@playwright/test";

function requireEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}

test.describe("Multi-tenant E2E", () => {
  test("Org A et Org B restent isoles", async ({ request }) => {
    const tokenA = requireEnv("E2E_ORG_A_SESSION_TOKEN");
    const tokenB = requireEnv("E2E_ORG_B_SESSION_TOKEN");
    test.skip(
      !tokenA || !tokenB,
      "Requires E2E_ORG_A_SESSION_TOKEN and E2E_ORG_B_SESSION_TOKEN",
    );

    const meA = await request.get("/api/auth/me", {
      headers: { cookie: `session=${tokenA}` },
    });
    const meB = await request.get("/api/auth/me", {
      headers: { cookie: `session=${tokenB}` },
    });

    expect(meA.status()).toBe(200);
    expect(meB.status()).toBe(200);
    const a = (await meA.json()) as { user: { organizationId: string } | null };
    const b = (await meB.json()) as { user: { organizationId: string } | null };

    expect(a.user).toBeTruthy();
    expect(b.user).toBeTruthy();
    expect(a.user?.organizationId).not.toBe(b.user?.organizationId);
  });
});
