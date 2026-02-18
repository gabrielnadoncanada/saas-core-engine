import type {
  MembershipsRepo,
  OrgsRepo,
  SubscriptionsRepo,
  TxRunner,
  UsersRepo,
} from "./org.ports";
import { orgErr } from "./errors";

export class OrgService<TTx = unknown> {
  constructor(
    private readonly orgs: OrgsRepo<TTx>,
    private readonly memberships: MembershipsRepo<TTx>,
    private readonly subs: SubscriptionsRepo<TTx>,
    private readonly users: UsersRepo<TTx>,
    private readonly txRunner: TxRunner<TTx>,
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

  async switchActiveOrganization(params: {
    userId: string;
    organizationId: string;
  }) {
    return this.txRunner.withTx(async (tx) => {
      const membership = await this.memberships.findUserMembership(
        {
          userId: params.userId,
          organizationId: params.organizationId,
        },
        tx,
      );

      if (!membership) {
        throw orgErr("forbidden", "User is not a member of this organization");
      }

      await this.users.setActiveOrganization(
        params.userId,
        params.organizationId,
        tx,
      );

      return { organizationId: params.organizationId };
    });
  }

  async listUserOrganizations(userId: string) {
    return this.memberships.listUserOrganizations(userId);
  }
}
