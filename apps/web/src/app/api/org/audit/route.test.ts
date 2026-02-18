import { beforeEach, describe, expect, it, vi } from "vitest";

const withRequiredOrgScope = vi.fn();
const queryOrgAudit = vi.fn();

vi.mock("@/server/auth/with-org-scope", () => ({
  withRequiredOrgScope,
}));

vi.mock("@/server/services/org-audit.service", () => ({
  queryOrgAudit,
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
}));

describe("GET /api/org/audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryOrgAudit.mockResolvedValue({
      rows: [
        {
          id: "a1",
          createdAt: new Date("2026-02-18T12:00:00.000Z"),
          actorUserId: "u1",
          action: "org.roles.updated",
          targetType: "role",
          targetId: "r1",
          outcome: "success",
          ip: "127.0.0.1",
          userAgent: "vitest",
          traceId: "trace-1",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    });
    withRequiredOrgScope.mockImplementation(async ({ run }: any) =>
      run({ userId: "u1", organizationId: "org1", role: "owner" }),
    );
  });

  it("queries audit with read permission", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/org/audit?page=1&pageSize=25"));
    const json = (await res.json()) as { ok: boolean; total: number };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.total).toBe(1);
    expect(withRequiredOrgScope).toHaveBeenCalledWith(
      expect.objectContaining({ action: "org:audit:read" }),
    );
  });

  it("exports csv with export permission", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/org/audit?format=csv"));
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(text).toContain("id,createdAt,actorUserId");
    expect(withRequiredOrgScope).toHaveBeenCalledWith(
      expect.objectContaining({ action: "org:audit:export" }),
    );
  });
});
