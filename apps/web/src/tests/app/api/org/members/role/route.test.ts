import { OrgCoreError } from "@org-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const changeMemberRole = vi.fn();
const withRequiredOrgScope = vi.fn();

vi.mock("@/server/auth/with-org-scope", () => ({
  withRequiredOrgScope,
}));

vi.mock("@/server/adapters/core/org-core.adapter", () => ({
  createMembershipService: () => ({
    changeMemberRole,
  }),
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
}));

describe("POST /api/org/members/role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    changeMemberRole.mockResolvedValue(undefined);
    withRequiredOrgScope.mockImplementation(async ({ run }: any) =>
      run({ userId: "u1", organizationId: "org1", role: "owner" }),
    );
  });

  it("returns 400 for invalid input", async () => {
    const { POST } = await import("../../../../../../app/api/org/members/role/route");

    const req = new Request("http://localhost/api/org/members/role", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ membershipId: "", role: "owner" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 and delegates to membership service", async () => {
    const { POST } = await import("../../../../../../app/api/org/members/role/route");

    const req = new Request("http://localhost/api/org/members/role", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ membershipId: "m1", role: "admin" }),
    });

    const res = await POST(req);
    const json = (await res.json()) as { ok?: boolean };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(changeMemberRole).toHaveBeenCalledWith({
      actorUserId: "u1",
      organizationId: "org1",
      membershipId: "m1",
      role: "admin",
    });
  });

  it("maps forbidden error to 403", async () => {
    changeMemberRole.mockRejectedValueOnce(
      new OrgCoreError("forbidden", "nope"),
    );
    const { POST } = await import("../../../../../../app/api/org/members/role/route");

    const req = new Request("http://localhost/api/org/members/role", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ membershipId: "m1", role: "member" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
