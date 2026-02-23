import { expect, test } from "@playwright/test";

function requireEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}

test.describe("Auth E2E", () => {
  test("Signup -> verify email -> login -> dashboard", async ({ page }) => {
    const email = requireEnv("E2E_SIGNUP_EMAIL");
    const password = requireEnv("E2E_SIGNUP_PASSWORD");
    const verifyToken = requireEnv("E2E_VERIFY_TOKEN");
    test.skip(
      !email || !password || !verifyToken,
      "Requires E2E_SIGNUP_EMAIL, E2E_SIGNUP_PASSWORD, E2E_VERIFY_TOKEN",
    );

    const signup = await page.request.post("/api/auth/signup", {
      data: { email, password, orgName: "E2E Org" },
    });
    expect([200, 409]).toContain(signup.status());

    const verify = await page.request.get(
      `/api/auth/verify-email/confirm?token=${encodeURIComponent(verifyToken!)}`,
    );
    expect([200, 307]).toContain(verify.status());

    const login = await page.request.post("/api/auth/login", {
      data: { email, password },
    });
    expect(login.status()).toBe(200);
    await expect(login.json()).resolves.toMatchObject({ ok: true });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("Mauvais password -> erreur generique", async ({ page }) => {
    const email = requireEnv("E2E_LOGIN_EMAIL");
    const badPassword = requireEnv("E2E_LOGIN_BAD_PASSWORD");
    test.skip(!email || !badPassword, "Requires E2E_LOGIN_EMAIL and E2E_LOGIN_BAD_PASSWORD");

    const res = await page.request.post("/api/auth/login", {
      data: { email, password: badPassword },
    });
    expect(res.status()).toBe(401);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "unauthorized" });
  });

  test("Reset password -> nouveau login OK", async ({ page }) => {
    const token = requireEnv("E2E_RESET_TOKEN");
    const newPassword = requireEnv("E2E_RESET_NEW_PASSWORD");
    const email = requireEnv("E2E_RESET_EMAIL");
    test.skip(
      !token || !newPassword || !email,
      "Requires E2E_RESET_TOKEN, E2E_RESET_NEW_PASSWORD, E2E_RESET_EMAIL",
    );

    const reset = await page.request.post("/api/auth/password/reset", {
      data: { token, newPassword },
    });
    expect(reset.status()).toBe(200);

    const login = await page.request.post("/api/auth/login", {
      data: { email, password: newPassword },
    });
    expect(login.status()).toBe(200);
    await expect(login.json()).resolves.toMatchObject({ ok: true });
  });

  test("Logout invalide la session", async ({ page }) => {
    const email = requireEnv("E2E_LOGIN_EMAIL");
    const password = requireEnv("E2E_LOGIN_PASSWORD");
    test.skip(!email || !password, "Requires E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD");

    const login = await page.request.post("/api/auth/login", {
      data: { email, password },
    });
    expect(login.status()).toBe(200);

    const before = await page.request.get("/api/auth/me");
    const beforeJson = (await before.json()) as { ok: boolean; user: unknown };
    expect(beforeJson.ok).toBe(true);
    expect(beforeJson.user).toBeTruthy();

    const logout = await page.request.post("/api/auth/logout");
    expect(logout.status()).toBe(200);

    const after = await page.request.get("/api/auth/me");
    const afterJson = (await after.json()) as { ok: boolean; user: unknown };
    expect(afterJson.ok).toBe(true);
    expect(afterJson.user).toBeNull();
  });
});
