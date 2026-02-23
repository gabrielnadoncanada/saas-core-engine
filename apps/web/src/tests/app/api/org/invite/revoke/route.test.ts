import { OrgCoreError } from "@org-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const revokeInvite = vi.fn();
const withRequiredOrgScope = vi.fn();

vi.mock("@/server/auth/with-org-scope", () => ({
  withRequiredOrgScope,
}));

vi.mock("@/server/adapters/core/org-core.adapter", () => ({
  createInviteService: () => ({
    revokeInvite,
  }),
}));

vi.mock("@/server/telemetry/otel", () => ({
  withApiTelemetry: async (_req: Request, _route: string, handler: () => Promise<Response>) =>
    handler(),
}));

describe("POST /api/org/invite/revoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revokeInvite.mockResolvedValue(undefined);
    withRequiredOrgScope.mockImplementation(async ({ run }: any) =>
      run({ userId: "u1", organizationId: "org1", role: "owner" }),
    );
  });

  it("returns 400 for invalid input", async () => {
    const { POST } = await import("../../../../../../app/api/org/invite/revoke/route");
    const req = new Request("http://localhost/api/org/invite/revoke", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invitationId: "" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("revokes invite when input is valid", async () => {
    const { POST } = await import("../../../../../../app/api/org/invite/revoke/route");
    const req = new Request("http://localhost/api/org/invite/revoke", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invitationId: "inv-1" }),
    });

    const res = await POST(req);
    const json = (await res.json()) as { ok: boolean };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(revokeInvite).toHaveBeenCalledWith({
      actorUserId: "u1",
      organizationId: "org1",
      invitationId: "inv-1",
    });
  });

  it("maps forbidden error to 403", async () => {
    revokeInvite.mockRejectedValueOnce(new OrgCoreError("forbidden", "nope"));
    const { POST } = await import("../../../../../../app/api/org/invite/revoke/route");
    const req = new Request("http://localhost/api/org/invite/revoke", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invitationId: "inv-1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
