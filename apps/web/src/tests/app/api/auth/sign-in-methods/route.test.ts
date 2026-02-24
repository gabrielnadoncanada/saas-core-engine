import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const findFirst = vi.fn();

vi.mock("@/server/auth/require-user", () => ({
  requireUser,
}));

vi.mock("@db", () => ({
  prisma: {
    user: {
      findFirst,
    },
  },
}));

vi.mock("@/server/config/env", () => ({
  env: {
    AUTH_SIGNIN_EMAIL_ENABLED: true,
    AUTH_SIGNIN_GOOGLE_ENABLED: true,
    AUTH_SIGNIN_GITHUB_ENABLED: true,
    GITHUB_OAUTH_CLIENT_ID: "gh-id",
    GITHUB_OAUTH_CLIENT_SECRET: "gh-secret",
    GITHUB_OAUTH_REDIRECT_URI: "http://localhost/api/auth/oauth/github/callback",
  },
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
}));

describe("GET /api/auth/sign-in-methods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns email + oauth methods with state and metadata", async () => {
    requireUser.mockResolvedValueOnce({ userId: "u1" });
    findFirst.mockResolvedValueOnce({
      email: "user@example.com",
      passwordHash: "hash",
      oauthAccounts: [
        {
          provider: "google",
          email: "user@gmail.com",
          providerAccountId: "g-sub",
          lastUsedAt: new Date("2026-01-02T12:00:00.000Z"),
        },
      ],
    });

    const { GET } = await import("@/app/api/auth/sign-in-methods/route");
    const res = await GET(new Request("http://localhost/api/auth/sign-in-methods"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.methods).toEqual([
      {
        provider: "email",
        label: "Email",
        connected: true,
        linkedIdentifier: "user@example.com",
        action: "manage",
        canDisconnect: true,
      },
      {
        provider: "google",
        label: "Google",
        connected: true,
        linkedIdentifier: "user@gmail.com",
        lastUsedAt: "2026-01-02T12:00:00.000Z",
        action: "disconnect",
        canDisconnect: true,
      },
      {
        provider: "github",
        label: "GitHub",
        connected: false,
        action: "connect",
        canDisconnect: false,
      },
    ]);
  });
});
