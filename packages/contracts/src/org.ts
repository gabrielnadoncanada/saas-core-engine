export type OrgErrorCode =
  | "forbidden"
  | "invalid_invite"
  | "invite_email_mismatch"
  | "unauthorized";

export type MembershipRole = "owner" | "admin" | "member";

export type InviteRole = Extract<MembershipRole, "admin" | "member">;

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