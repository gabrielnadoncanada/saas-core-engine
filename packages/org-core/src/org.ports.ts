import type {
  InvitationSummary,
  MembershipRole,
  MembershipSummary,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@contracts";

export interface OrgsRepo<TTx = unknown> {
  create(name: string, tx?: TTx): Promise<{ id: string }>;
}

export interface MembershipsRepo<TTx = unknown> {
  create(
    params: { userId: string; organizationId: string; role: MembershipRole },
    tx?: TTx,
  ): Promise<{ id: string }>;
  findUserMembership(
    params: { userId: string; organizationId: string },
    tx?: TTx,
  ): Promise<MembershipSummary | null>;
  ensureMembership(
    params: { userId: string; organizationId: string; role: MembershipRole },
    tx?: TTx,
  ): Promise<{ id: string }>;
  findById(membershipId: string, tx?: TTx): Promise<MembershipSummary | null>;
  countByRole(
    params: { organizationId: string; role: MembershipRole },
    tx?: TTx,
  ): Promise<number>;
  updateRole(membershipId: string, role: MembershipRole, tx?: TTx): Promise<void>;
  remove(membershipId: string, tx?: TTx): Promise<void>;
  listOrgMembers(
    organizationId: string,
    tx?: TTx,
  ): Promise<Array<MembershipSummary & { user: { email: string } }>>;
  listUserOrganizations(
    userId: string,
    tx?: TTx,
  ): Promise<Array<{ organizationId: string; name: string; role: MembershipRole }>>;
}

export interface SubscriptionsRepo<TTx = unknown> {
  upsertOrgSubscription(
    params: {
      organizationId: string;
      plan: SubscriptionPlan;
      status: SubscriptionStatus;
      providerCustomerId?: string | null;
      providerSubscriptionId?: string | null;
      currentPeriodEnd?: Date | null;
    },
    tx?: TTx,
  ): Promise<{ id: string }>;
}

export interface InvitationsRepo<TTx = unknown> {
  create(
    params: {
      organizationId: string;
      email: string;
      role: MembershipRole;
      tokenHash: string;
      expiresAt: Date;
    },
    tx?: TTx,
  ): Promise<InvitationSummary>;
  findValidByTokenHash(
    tokenHash: string,
    tx?: TTx,
  ): Promise<InvitationSummary | null>;
  findByTokenHash(tokenHash: string, tx?: TTx): Promise<InvitationSummary | null>;
  findById(invitationId: string, tx?: TTx): Promise<InvitationSummary | null>;
  markAcceptedIfPending(invitationId: string, tx?: TTx): Promise<boolean>;
  listPending(organizationId: string, tx?: TTx): Promise<InvitationSummary[]>;
  findPendingByEmail(
    params: { organizationId: string; email: string },
    tx?: TTx,
  ): Promise<InvitationSummary | null>;
  revokeIfPending(invitationId: string, tx?: TTx): Promise<boolean>;
}

export interface UsersRepo<TTx = unknown> {
  findById(userId: string, tx?: TTx): Promise<{ id: string; email: string } | null>;
  setActiveOrganization(
    userId: string,
    organizationId: string,
    tx?: TTx,
  ): Promise<void>;
}

export interface TxRunner<TTx = unknown> {
  withTx<T>(fn: (tx: TTx) => Promise<T>): Promise<T>;
}

export interface InviteToken {
  randomToken(): string;
  hashToken(rawToken: string): string;
}
