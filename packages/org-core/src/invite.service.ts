import type { InviteRole } from "@contracts";
import type {
  InviteToken,
  InvitationsRepo,
  MembershipsRepo,
  TxRunner,
  UsersRepo,
} from "./org.ports";

export class InviteService {
  constructor(
    private readonly invites: InvitationsRepo,
    private readonly users: UsersRepo,
    private readonly memberships: MembershipsRepo,
    private readonly txRunner: TxRunner,
    private readonly inviteToken: InviteToken,
  ) {}

  async createInvite(params: {
    organizationId: string;
    inviterUserId: string;
    email: string;
    role: InviteRole;
    ttlMinutes: number;
  }) {
    const rawToken = this.inviteToken.randomToken();
    const tokenHash = this.inviteToken.hashToken(rawToken);

    const expiresAt = new Date(Date.now() + params.ttlMinutes * 60 * 1000);

    const invite = await this.invites.create({
      organizationId: params.organizationId,
      email: params.email,
      role: params.role,
      tokenHash,
      expiresAt,
    });

    return { inviteId: invite.id, token: rawToken, expiresAt };
  }

  async acceptInvite(params: { token: string; acceptUserId: string }) {
    const tokenHash = this.inviteToken.hashToken(params.token);

    return this.txRunner.withTx(async (tx) => {
      const invite = await this.invites.findValidByTokenHash(tokenHash, tx);
      if (!invite) throw new Error("INVALID_INVITE");

      const user = await this.users.findById(params.acceptUserId, tx);
      if (!user) throw new Error("UNAUTHORIZED");

      if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
        throw new Error("INVITE_EMAIL_MISMATCH");
      }

      const existing = await this.memberships.findUserMembership(
        { userId: user.id, organizationId: invite.organizationId },
        tx,
      );

      if (!existing) {
        await this.memberships.create(
          {
            userId: user.id,
            organizationId: invite.organizationId,
            role: invite.role,
          },
          tx,
        );
      }

      await this.invites.markAccepted(invite.id, tx);

      return { organizationId: invite.organizationId };
    });
  }

  async listPendingInvites(organizationId: string) {
    return this.invites.listPending(organizationId);
  }
}