export interface BillingOrganizationRepo {
  findById(
    organizationId: string,
  ): Promise<{ id: string; name: string | null } | null>;
}

export interface BillingSubscriptionRepo {
  findByOrg(
    organizationId: string,
  ): Promise<{ providerCustomerId: string | null } | null>;
  upsertOrgSubscription(params: {
    organizationId: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    providerCustomerId?: string | null;
    providerSubscriptionId?: string | null;
    currentPeriodEnd?: Date | null;
  }): Promise<{ id: string }>;
}

export interface BillingProvider {
  createCustomer(params: {
    organizationId: string;
    orgName?: string | null;
  }): Promise<{ customerId: string }>;
  createCheckoutSession(params: {
    customerId: string;
    organizationId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string | null }>;
  createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;
}

export class BillingSessionService {
  constructor(
    private readonly orgs: BillingOrganizationRepo,
    private readonly subs: BillingSubscriptionRepo,
    private readonly provider: BillingProvider,
  ) {}

  async ensureCustomerForOrg(params: { organizationId: string }) {
    const existing = await this.subs.findByOrg(params.organizationId);
    if (existing?.providerCustomerId) return existing.providerCustomerId;

    const org = await this.orgs.findById(params.organizationId);
    const customer = await this.provider.createCustomer({
      organizationId: params.organizationId,
      orgName: org?.name ?? null,
    });

    await this.subs.upsertOrgSubscription({
      organizationId: params.organizationId,
      plan: "free",
      status: "inactive",
      providerCustomerId: customer.customerId,
    });

    return customer.customerId;
  }

  async createCheckoutSession(params: {
    organizationId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const customerId = await this.ensureCustomerForOrg({
      organizationId: params.organizationId,
    });

    return this.provider.createCheckoutSession({
      customerId,
      organizationId: params.organizationId,
      priceId: params.priceId,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
    });
  }

  async createPortalSession(params: {
    organizationId: string;
    returnUrl: string;
  }) {
    const sub = await this.subs.findByOrg(params.organizationId);
    if (!sub?.providerCustomerId) {
      return null;
    }

    return this.provider.createPortalSession({
      customerId: sub.providerCustomerId,
      returnUrl: params.returnUrl,
    });
  }
}
import type { SubscriptionPlan, SubscriptionStatus } from "@contracts";
