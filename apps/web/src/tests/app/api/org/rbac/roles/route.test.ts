import { beforeEach, describe, expect, it, vi } from "vitest";

const withRequiredOrgScope = vi.fn();
const createOrgRole = vi.fn();
const listOrgRoles = vi.fn();

vi.mock("@/server/auth/with-org-scope", () => ({
  withRequiredOrgScope,
}));

vi.mock("@/server/services/org-rbac.service", () => ({
  createOrgRole,
  listOrgRoles,
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
}));

describe("org rbac roles route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withRequiredOrgScope.mockImplementation(async ({ run }: any) =>
      run({ userId: "u1", organizationId: "org1", role: "owner" }),
    );
    createOrgRole.mockResolvedValue({
      id: "role-1",
      key: "support-agent",
      name: "Support Agent",
    });
    listOrgRoles.mockResolvedValue([{ id: "role-1" }]);
  });

  it("returns roles list on GET", async () => {
    const { GET } = await import("../../../../../../app/api/org/rbac/roles/route");
    const res = await GET(new Request("http://localhost/api/org/rbac/roles"));
    const json = (await res.json()) as { ok: boolean; roles: Array<{ id: string }> };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.roles[0]?.id).toBe("role-1");
    expect(withRequiredOrgScope).toHaveBeenCalledWith(
      expect.objectContaining({ action: "org:rbac:manage" }),
    );
  });

  it("returns 400 on invalid payload", async () => {
    const { POST } = await import("../../../../../../app/api/org/rbac/roles/route");
    const res = await POST(
      new Request("http://localhost/api/org/rbac/roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(createOrgRole).not.toHaveBeenCalled();
  });

  it("creates role on POST", async () => {
    const { POST } = await import("../../../../../../app/api/org/rbac/roles/route");
    const res = await POST(
      new Request("http://localhost/api/org/rbac/roles", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "vitest",
        },
        body: JSON.stringify({ name: "Support Agent", description: "ops role" }),
      }),
    );
    const json = (await res.json()) as { ok: boolean; role: { id: string } };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(createOrgRole).toHaveBeenCalledWith({
      organizationId: "org1",
      name: "Support Agent",
      description: "ops role",
      createdByUserId: "u1",
    });
  });
});
