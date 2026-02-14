import {
  UsersRepo,
  OrgsRepo,
  MembershipsRepo,
  SubscriptionsRepo,
  withTx,
} from "@db";
import { hashPassword } from "../hashing/password";

export class SignupFlow {
  constructor(
    private readonly users = new UsersRepo(),
    private readonly orgs = new OrgsRepo(),
    private readonly memberships = new MembershipsRepo(),
    private readonly subs = new SubscriptionsRepo(),
  ) {}

  async execute(params: { email: string; password: string; orgName: string }) {
    const email = params.email.toLowerCase();

    return withTx(async (tx) => {
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
        { organizationId: org.id, plan: "free", status: "inactive" },
        tx,
      );

      return { userId: user.id, organizationId: org.id };
    });
  }
}
