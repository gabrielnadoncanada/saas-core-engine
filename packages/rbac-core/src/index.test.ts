import { describe, expect, it } from "vitest";
import { can, RbacForbiddenError, requirePermission } from "./index";

describe("rbac-core", () => {
  const owner = { userId: "u1", role: "owner" as const, organizationId: "org1" };
  const admin = { userId: "u2", role: "admin" as const, organizationId: "org1" };
  const member = { userId: "u3", role: "member" as const, organizationId: "org1" };

  it("allows owner on transfer ownership", () => {
    expect(
      can(owner, "org:member:transfer_ownership", {
        resource: "membership",
        organizationId: "org1",
      }),
    ).toBe(true);
  });

  it("denies member on member role change", () => {
    expect(
      can(member, "org:member:role:change", {
        resource: "membership",
        organizationId: "org1",
      }),
    ).toBe(false);
  });

  it("throws when permission is missing", () => {
    expect(() =>
      requirePermission(member, "org:invite:create", {
        organizationId: "org1",
      }),
    ).toThrow(
      RbacForbiddenError,
    );
  });

  it("denies cross-organization access", () => {
    expect(
      can(admin, "org:invite:create", {
        resource: "invitation",
        organizationId: "org2",
      }),
    ).toBe(false);
  });

  it("denies admin for owner-targeted actions", () => {
    expect(
      can(admin, "org:member:role:change", {
        resource: "membership",
        organizationId: "org1",
        targetRole: "owner",
      }),
    ).toBe(false);
  });

  it("allows custom permission from DB role", () => {
    expect(
      can(member, "org:invite:create", {
        resource: "invitation",
        organizationId: "org1",
      }, {
        customPermissions: ["org:invite:create:invitation"],
      }),
    ).toBe(true);
  });

  it("blocks owner-guarded actions when impersonating", () => {
    expect(
      can(owner, "org:member:remove", {
        resource: "membership",
        organizationId: "org1",
      }, {
        isImpersonating: true,
      }),
    ).toBe(false);
  });
});
