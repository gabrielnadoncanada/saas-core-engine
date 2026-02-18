import type { MembershipRole } from "@contracts";

export type RbacAction =
  | "org:create"
  | "org:list"
  | "org:switch"
  | "org:invite:create"
  | "org:member:role:change"
  | "org:member:remove"
  | "org:member:transfer_ownership";

export type RbacResource = "organization" | "membership" | "invitation";

export type Permission = `${RbacAction}:${RbacResource}`;

export type RbacUser = {
  userId: string;
  role: MembershipRole;
  organizationId: string;
};

export type RbacResourceContext = {
  resource: RbacResource;
  organizationId: string;
  targetRole?: MembershipRole;
  ownerUserId?: string;
};

export const PERMISSIONS: Record<RbacAction, RbacResource> = {
  "org:create": "organization",
  "org:list": "organization",
  "org:switch": "organization",
  "org:invite:create": "invitation",
  "org:member:role:change": "membership",
  "org:member:remove": "membership",
  "org:member:transfer_ownership": "membership",
};

const ROLE_MATRIX: Record<MembershipRole, Set<RbacAction>> = {
  owner: new Set<RbacAction>([
    "org:create",
    "org:list",
    "org:switch",
    "org:invite:create",
    "org:member:role:change",
    "org:member:remove",
    "org:member:transfer_ownership",
  ]),
  admin: new Set<RbacAction>([
    "org:create",
    "org:list",
    "org:switch",
    "org:invite:create",
    "org:member:role:change",
    "org:member:remove",
  ]),
  member: new Set<RbacAction>(["org:create", "org:list", "org:switch"]),
};

export function can(
  user: RbacUser,
  action: RbacAction,
  resource: RbacResourceContext,
): boolean {
  if (user.organizationId !== resource.organizationId) return false;

  const permissions = ROLE_MATRIX[user.role];
  if (!permissions || !permissions.has(action)) return false;

  if (user.role === "admin") {
    if (
      action === "org:member:transfer_ownership" ||
      resource.targetRole === "owner"
    ) {
      return false;
    }
  }

  if (user.role === "member") {
    return false;
  }

  return permissions ? permissions.has(action) : false;
}

export class RbacForbiddenError extends Error {
  constructor(
    public readonly userId: string,
    public readonly action: RbacAction,
    public readonly resource: RbacResource,
  ) {
    super(`Missing permission for action=${action}, resource=${resource}`);
    this.name = "RbacForbiddenError";
  }
}

export function requirePermission(
  user: RbacUser,
  action: RbacAction,
  resource: Omit<RbacResourceContext, "resource"> & { resource?: RbacResource },
): void {
  const resolvedResource = resource.resource ?? PERMISSIONS[action];
  const ctx: RbacResourceContext = {
    ...resource,
    resource: resolvedResource,
  };
  if (can(user, action, ctx)) return;
  throw new RbacForbiddenError(user.userId, action, resolvedResource);
}
