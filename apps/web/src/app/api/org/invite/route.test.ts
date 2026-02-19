import { beforeEach, describe, expect, it, vi } from "vitest";

const withRequiredOrgScope = vi.fn();
const createInvite = vi.fn();
const logOrgAudit = vi.fn();
const sendOrgInvite = vi.fn();
const enforceOrgActionRateLimit = vi.fn();
const logInfo = vi.fn();
const logWarn = vi.fn();
const logError = vi.fn();
const enqueueOrgInviteEmail = vi.fn();

vi.mock("@/server/auth/with-org-scope", () => ({
  withRequiredOrgScope,
}));

vi.mock("@/server/adapters/core/org-core.adapter", () => ({
  createInviteService: () => ({
    createInvite,
  }),
}));

vi.mock("@/server/services/org-audit.service", () => ({
  logOrgAudit,
}));

vi.mock("@/server/services/email.service", () => ({
  getEmailService: () => ({
    sendOrgInvite,
  }),
}));

vi.mock("@/server/services/url.service", () => ({
  absoluteUrl: vi.fn((path: string) => `http://localhost${path}`),
}));

vi.mock("@/server/rate-limit/org-action-rate-limit", () => ({
  enforceOrgActionRateLimit,
  isOrgActionRateLimitError: (error: unknown) =>
    error instanceof Error && error.message === "ORG_ACTION_RATE_LIMITED",
}));

vi.mock("@/server/logging/logger", () => ({
  logInfo,
  logWarn,
  logError,
}));

vi.mock("@/server/jobs/queues", () => ({
  enqueueOrgInviteEmail,
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
  getActiveTraceContext: () => null,
}));

vi.mock("@db", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn().mockResolvedValue({ name: "Acme" }),
    },
  },
}));

describe("POST /api/org/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRequiredOrgScope.mockImplementation(async ({ run }: any) =>
      run({ userId: "u1", organizationId: "org1", role: "owner" }),
    );
    createInvite.mockResolvedValue({ token: "token-123" });
    logOrgAudit.mockResolvedValue(undefined);
    sendOrgInvite.mockResolvedValue(undefined);
    enforceOrgActionRateLimit.mockResolvedValue(undefined);
    enqueueOrgInviteEmail.mockRejectedValue(new Error("QUEUE_DISABLED"));
  });

  it("returns 400 for invalid body", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/org/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "bad", role: "owner" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("returns 429 when invite rate limit is exceeded", async () => {
    enforceOrgActionRateLimit.mockRejectedValueOnce(
      new Error("ORG_ACTION_RATE_LIMITED"),
    );

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/org/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", role: "admin" }),
    });

    const res = await POST(req);
    const json = (await res.json()) as { ok: boolean; error: string };

    expect(res.status).toBe(429);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("rate_limited");
  });

  it("returns 200 for valid request", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/org/invite", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "rid-1" },
      body: JSON.stringify({ email: "test@example.com", role: "member" }),
    });

    const res = await POST(req);
    const json = (await res.json()) as { ok: boolean };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(res.headers.get("x-request-id")).toBe("rid-1");
    expect(createInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org1",
        inviterUserId: "u1",
        email: "test@example.com",
        role: "member",
      }),
    );
  });
});
