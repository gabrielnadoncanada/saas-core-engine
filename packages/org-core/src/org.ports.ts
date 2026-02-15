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
  listOrgMembers(organizationId: string, tx?: any): Promise<MembershipSummary[]>;
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
  markAccepted(invitationId: string, tx?: any): Promise<void>;
  listPending(organizationId: string, tx?: any): Promise<InvitationSummary[]>;
}

export interface UsersRepo {
  findById(userId: string, tx?: any): Promise<{ id: string; email: string } | null>;
}

export interface TxRunner {
  withTx<T>(fn: (tx: any) => Promise<T>): Promise<T>;
}

export interface InviteToken {
  randomToken(): string;
  hashToken(rawToken: string): string;
}