import { type MembershipRole } from "@contracts";

export type RbacAction =
  | "org:create"
  | "org:list"
  | "org:switch"
  | "org:invite:create"
  | "org:member:role:change"
  | "org:member:remove"
  | "org:member:transfer_ownership"
  | "org:rbac:manage"
  | "org:audit:read"
  | "org:audit:export"
  | "org:impersonation:start"
  | "org:impersonation:stop"
  | "ai:assistant:use"
  | "ai:tools:execute"
  | "ai:usage:read"
  | "ai:audit:read"
  | "ai:prompts:manage";

export type RbacResource =
  | "organization"
  | "membership"
  | "invitation"
  | "role"
  | "audit"
  | "impersonation"
  | "ai";

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

export type RbacDecisionContext = {
  customPermissions?: string[];
  allowOwnerTargetActions?: boolean;
  isImpersonating?: boolean;
};

export const PERMISSIONS: Record<RbacAction, RbacResource> = {
  "org:create": "organization",
  "org:list": "organization",
  "org:switch": "organization",
  "org:invite:create": "invitation",
  "org:member:role:change": "membership",
  "org:member:remove": "membership",
  "org:member:transfer_ownership": "membership",
  "org:rbac:manage": "role",
  "org:audit:read": "audit",
  "org:audit:export": "audit",
  "org:impersonation:start": "impersonation",
  "org:impersonation:stop": "impersonation",
  "ai:assistant:use": "ai",
  "ai:tools:execute": "ai",
  "ai:usage:read": "ai",
  "ai:audit:read": "ai",
  "ai:prompts:manage": "ai",
};

const OWNER_GUARDED_ACTIONS = new Set<RbacAction>([
  "org:member:transfer_ownership",
  "org:member:role:change",
  "org:member:remove",
]);

const ROLE_MATRIX: Record<MembershipRole, Set<RbacAction>> = {
  owner: new Set<RbacAction>([
    "org:create",
    "org:list",
    "org:switch",
    "org:invite:create",
    "org:member:role:change",
    "org:member:remove",
    "org:member:transfer_ownership",
    "org:rbac:manage",
    "org:audit:read",
    "org:audit:export",
    "org:impersonation:start",
    "org:impersonation:stop",
    "ai:assistant:use",
    "ai:tools:execute",
    "ai:usage:read",
    "ai:audit:read",
    "ai:prompts:manage",
  ]),
  super_admin: new Set<RbacAction>([
    "org:create",
    "org:list",
    "org:switch",
    "org:invite:create",
    "org:member:role:change",
    "org:member:remove",
    "org:member:transfer_ownership",
    "org:rbac:manage",
    "org:audit:read",
    "org:audit:export",
    "org:impersonation:start",
    "org:impersonation:stop",
    "ai:assistant:use",
    "ai:tools:execute",
    "ai:usage:read",
    "ai:audit:read",
    "ai:prompts:manage",
  ]),
  admin: new Set<RbacAction>([
    "org:create",
    "org:list",
    "org:switch",
    "org:invite:create",
    "org:member:role:change",
    "org:member:remove",
    "org:audit:read",
    "org:audit:export",
    "org:impersonation:start",
    "org:impersonation:stop",
    "ai:assistant:use",
    "ai:tools:execute",
    "ai:usage:read",
    "ai:audit:read",
    "ai:prompts:manage",
  ]),
  member: new Set<RbacAction>([
    "org:create",
    "org:list",
    "org:switch",
    "ai:assistant:use",
    "ai:tools:execute",
    "ai:usage:read",
    "ai:audit:read",
  ]),
};

export function can(
  user: RbacUser,
  action: RbacAction,
  resource: RbacResourceContext,
  decision: RbacDecisionContext = {},
): boolean {
  if (user.organizationId !== resource.organizationId) return false;

  const permissions = ROLE_MATRIX[user.role];
  const defaultAllowed = Boolean(permissions && permissions.has(action));
  const permissionKey = `${action}:${resource.resource}`;
  const customAllowed = decision.customPermissions?.includes(permissionKey) ?? false;

  if (!defaultAllowed && !customAllowed) return false;

  if (decision.isImpersonating && OWNER_GUARDED_ACTIONS.has(action)) {
    return false;
  }

  if (user.role === "admin") {
    if (
      action === "org:member:transfer_ownership" ||
      resource.targetRole === "owner"
    ) {
      return decision.allowOwnerTargetActions ?? false;
    }
  }

  if (
    resource.targetRole === "owner" &&
    user.role !== "owner" &&
    user.role !== "super_admin" &&
    !decision.allowOwnerTargetActions
  ) {
    return false;
  }

  return true;
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
  decision?: RbacDecisionContext,
): void {
  const resolvedResource = resource.resource ?? PERMISSIONS[action];
  const ctx: RbacResourceContext = {
    ...resource,
    resource: resolvedResource,
  };
  if (can(user, action, ctx, decision)) return;
  throw new RbacForbiddenError(user.userId, action, resolvedResource);
}

export {
  OrgRbacService,
  type OrgRbacRoleRepo,
  type OrgRbacPermissionRepo,
  type OrgRbacMembershipRepo,
  type OrgRbacAssignmentsRepo,
  type OrgRolePermissionInput,
  type OrgRoleWithPermissions,
} from "./custom-rbac.service";
