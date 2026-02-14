import { MembershipsRepo, OrgsRepo, SubscriptionsRepo, withTx } from "@db";

export class OrgService {
  constructor(
    private readonly orgs = new OrgsRepo(),
    private readonly memberships = new MembershipsRepo(),
    private readonly subs = new SubscriptionsRepo(),
  ) {}

  async createOrg(params: { ownerUserId: string; name: string }) {
    return withTx(async (tx) => {
      const org = await this.orgs.create(params.name, tx);

      await this.memberships.create(
        { userId: params.ownerUserId, organizationId: org.id, role: "owner" },
        tx,
      );

      await this.subs.upsertOrgSubscription(
        { organizationId: org.id, plan: "free", status: "inactive" },
        tx,
      );

      return { organizationId: org.id };
    });
  }
}
