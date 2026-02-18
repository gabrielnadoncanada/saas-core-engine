import type {
  InvitationSummary,
  MembershipRole,
  MembershipSummary,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@contracts";

export interface OrgsRepo {
  create(name: string, tx?: any): Promise<{ id: string }>;
}

export interface MembershipsRepo {
  create(
    params: { userId: string; organizationId: string; role: MembershipRole },
    tx?: any,
  ): Promise<{ id: string }>;
  findUserMembership(
    params: { userId: string; organizationId: string },
    tx?: any,
  ): Promise<MembershipSummary | null>;
  ensureMembership(
    params: { userId: string; organizationId: string; role: MembershipRole },
    tx?: any,
  ): Promise<{ id: string }>;
  findById(membershipId: string, tx?: any): Promise<MembershipSummary | null>;
  countByRole(
    params: { organizationId: string; role: MembershipRole },
    tx?: any,
  ): Promise<number>;
  updateRole(membershipId: string, role: MembershipRole, tx?: any): Promise<void>;
  remove(membershipId: string, tx?: any): Promise<void>;
  listOrgMembers(
    organizationId: string,
    tx?: any,
  ): Promise<Array<MembershipSummary & { user: { email: string } }>>;
}

export interface SubscriptionsRepo {
  upsertOrgSubscription(
    params: {
      organizationId: string;
      plan: SubscriptionPlan;
      status: SubscriptionStatus;
      stripeCustomerId?: string | null;
      stripeSubscriptionId?: string | null;
      currentPeriodEnd?: Date | null;
    },
    tx?: any,
  ): Promise<{ id: string }>;
}

export interface InvitationsRepo {
  create(
    params: {
      organizationId: string;
      email: string;
      role: MembershipRole;
      tokenHash: string;
      expiresAt: Date;
    },
    tx?: any,
  ): Promise<InvitationSummary>;
  findValidByTokenHash(
    tokenHash: string,
    tx?: any,
  ): Promise<InvitationSummary | null>;
  markAcceptedIfPending(invitationId: string, tx?: any): Promise<boolean>;
  listPending(organizationId: string, tx?: any): Promise<InvitationSummary[]>;
}

export interface UsersRepo {
  findById(userId: string, tx?: any): Promise<{ id: string; email: string } | null>;
  setActiveOrganization(
    userId: string,
    organizationId: string,
    tx?: any,
  ): Promise<void>;
}

export interface TxRunner {
  withTx<T>(fn: (tx: any) => Promise<T>): Promise<T>;
}

export interface InviteToken {
  randomToken(): string;
  hashToken(rawToken: string): string;
}
