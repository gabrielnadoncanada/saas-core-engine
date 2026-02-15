import type {
  MembershipsRepo,
  OrgsRepo,
  SubscriptionsRepo,
  TxRunner,
  UsersRepo,
} from "../auth.ports";
import { hashPassword } from "../hashing/password";

export class SignupFlow {
  constructor(
    private readonly users: UsersRepo,
    private readonly orgs: OrgsRepo,
    private readonly memberships: MembershipsRepo,
    private readonly subs: SubscriptionsRepo,
    private readonly txRunner: TxRunner,
  ) {}

  async execute(params: { email: string; password: string; orgName: string }) {
    const email = params.email.toLowerCase();

    return this.txRunner.withTx(async (tx) => {
      const existing = await this.users.findByEmail(email, tx);
      if (existing) throw new Error("Email already in use");

      const passwordHash = await hashPassword(params.password);

      const user = await this.users.create({ email, passwordHash }, tx);
      const org = await this.orgs.create(params.orgName, tx);
      await this.memberships.create(
        { userId: user.id, organizationId: org.id, role: "owner" },
        tx,
      );

      await this.subs.upsertOrgSubscription(
        {
          organizationId: org.id,
          plan: "free",
          status: "inactive",
        },
        tx,
      );

      return { userId: user.id, organizationId: org.id };
    });
  }
}