import type {
  MembershipsRepo,
  OrgsRepo,
  SubscriptionsRepo,
  TxRunner,
  UsersRepo,
} from "./org.ports";

export class OrgService {
  constructor(
    private readonly orgs: OrgsRepo,
    private readonly memberships: MembershipsRepo,
    private readonly subs: SubscriptionsRepo,
    private readonly users: UsersRepo,
    private readonly txRunner: TxRunner,
  ) {}

  async createOrg(params: { ownerUserId: string; name: string }) {
    return this.txRunner.withTx(async (tx) => {
      const org = await this.orgs.create(params.name, tx);

      await this.memberships.create(
        { userId: params.ownerUserId, organizationId: org.id, role: "owner" },
        tx,
      );

      await this.subs.upsertOrgSubscription(
        { organizationId: org.id, plan: "free", status: "inactive" },
        tx,
      );
      await this.users.setActiveOrganization(params.ownerUserId, org.id, tx);

      return { organizationId: org.id };
    });
  }
}
