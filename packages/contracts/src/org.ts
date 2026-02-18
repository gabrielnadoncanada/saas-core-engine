import { z } from "zod";

export type OrgErrorCode =
  | "forbidden"
  | "invalid_invite"
  | "invite_email_mismatch"
  | "unauthorized";

export const membershipRoleSchema = z.enum(["owner", "admin", "member"]);
export type MembershipRole = z.infer<typeof membershipRoleSchema>;

export const inviteRoleSchema = z.enum(["admin", "member"]);
export type InviteRole = z.infer<typeof inviteRoleSchema>;

export const orgInviteBodySchema = z.object({
  email: z.string().trim().email().max(320),
  role: inviteRoleSchema,
});

export const orgCreateBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const orgSwitchBodySchema = z.object({
  organizationId: z.string().trim().min(1),
});

export const orgMembershipIdBodySchema = z.object({
  membershipId: z.string().trim().min(1),
});

export const orgMemberRoleChangeBodySchema = z.object({
  membershipId: z.string().trim().min(1),
  role: inviteRoleSchema,
});

export const orgRoleCreateBodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional(),
});

export const orgRolePermissionsBodySchema = z.object({
  permissions: z
    .array(
      z.object({
        action: z.string().trim().min(3).max(120),
        resource: z.string().trim().min(2).max(120),
      }),
    )
    .max(200),
});

export const orgMembershipRolesBodySchema = z.object({
  roleIds: z.array(z.string().trim().min(1)).max(50),
});

export const orgImpersonationStartBodySchema = z.object({
  targetUserId: z.string().trim().min(1),
});

export interface OrganizationSummary {
  id: string;
  name: string;
  createdAt: Date;
}

export interface MembershipSummary {
  id: string;
  userId: string;
  organizationId: string;
  role: MembershipRole;
  createdAt: Date;
}

export interface InvitationSummary {
  id: string;
  organizationId: string;
  email: string;
  role: MembershipRole;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
}
