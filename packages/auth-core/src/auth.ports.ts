import type {
  EmailTokenType,
  MembershipRole,
  OAuthProvider,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@contracts";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string | null;
}

export interface SessionRecord {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  ip: string | null;
  userAgent: string | null;
}

export interface OrgRecord {
  id: string;
}

export interface EmailTokenRecord {
  id: string;
  email: string;
  userId: string | null;
  type: EmailTokenType;
}

export interface OAuthStateRecord {
  id: string;
  provider: OAuthProvider;
  codeVerifier: string;
  redirectUri: string;
}

export interface OAuthAccountRecord {
  userId: string;
}

export interface UsersRepo {
  findById(userId: string, tx?: any): Promise<UserRecord | null>;
  findByEmail(email: string, tx?: any): Promise<UserRecord | null>;
  create(
    params: { email: string; passwordHash?: string | null },
    tx?: any,
  ): Promise<UserRecord>;
  markEmailVerified(userId: string, tx?: any): Promise<void>;
  setPasswordHash(userId: string, passwordHash: string, tx?: any): Promise<void>;
  touchLastLogin(userId: string, tx?: any): Promise<void>;
}

export interface SessionsRepo {
  create(
    params: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
      ip?: string | null;
      userAgent?: string | null;
    },
    tx?: any,
  ): Promise<{ id: string }>;
  findActiveByTokenHash(tokenHash: string, tx?: any): Promise<SessionRecord | null>;
  listActiveByUser(userId: string, tx?: any): Promise<SessionRecord[]>;
  revokeSession(sessionId: string, tx?: any): Promise<void>;
  revokeAllForUser(userId: string, tx?: any): Promise<void>;
}

export interface OrgsRepo {
  create(name: string, tx?: any): Promise<OrgRecord>;
}

export interface MembershipsRepo {
  create(
    params: { userId: string; organizationId: string; role: MembershipRole },
    tx?: any,
  ): Promise<{ id: string }>;
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

export interface EmailTokenRepo {
  create(
    params: {
      email: string;
      userId?: string | null;
      type: EmailTokenType;
      tokenHash: string;
      expiresAt: Date;
    },
    tx?: any,
  ): Promise<{ id: string }>;
  findValidByTokenHash(tokenHash: string, tx?: any): Promise<EmailTokenRecord | null>;
  markUsed(id: string, tx?: any): Promise<void>;
}

export interface OAuthStatesRepo {
  create(
    params: {
      provider: OAuthProvider;
      stateHash: string;
      codeVerifier: string;
      redirectUri: string;
      expiresAt: Date;
    },
    tx?: any,
  ): Promise<{ id: string }>;
  findValidByStateHash(stateHash: string, tx?: any): Promise<OAuthStateRecord | null>;
  deleteById(id: string, tx?: any): Promise<void>;
}

export interface OAuthAccountsRepo {
  findByProviderAccount(
    params: { provider: OAuthProvider; providerAccountId: string },
    tx?: any,
  ): Promise<OAuthAccountRecord | null>;
  create(
    params: {
      userId: string;
      provider: OAuthProvider;
      providerAccountId: string;
      email?: string | null;
    },
    tx?: any,
  ): Promise<{ id: string }>;
}

export interface TxRunner {
  withTx<T>(fn: (tx: any) => Promise<T>): Promise<T>;
}