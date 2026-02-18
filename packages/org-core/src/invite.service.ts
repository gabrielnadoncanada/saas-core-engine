import type { InviteRole } from "@contracts";
import { orgErr } from "./errors";
import type {
  InviteToken,
  InvitationsRepo,
  MembershipsRepo,
  TxRunner,
  UsersRepo,
} from "./org.ports";

export class InviteService<TTx = unknown> {
  constructor(
    private readonly invites: InvitationsRepo<TTx>,
    private readonly users: UsersRepo<TTx>,
    private readonly memberships: MembershipsRepo<TTx>,
    private readonly txRunner: TxRunner<TTx>,
    private readonly inviteToken: InviteToken,
  ) {}

  async createInvite(params: {
    organizationId: string;
    inviterUserId: string;
    email: string;
    role: InviteRole;
    ttlMinutes: number;
  }) {
    const inviterMembership = await this.memberships.findUserMembership({
      userId: params.inviterUserId,
      organizationId: params.organizationId,
    });
    if (!inviterMembership || !["owner", "admin"].includes(inviterMembership.role)) {
      throw orgErr("forbidden", "Only owner/admin can invite members");
    }

    const rawToken = this.inviteToken.randomToken();
    const tokenHash = this.inviteToken.hashToken(rawToken);

    const clampedTtlMinutes = Math.max(60, Math.min(60 * 24 * 7, params.ttlMinutes));
    const expiresAt = new Date(Date.now() + clampedTtlMinutes * 60 * 1000);

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
      const user = await this.users.findById(params.acceptUserId, tx);
      if (!user) throw orgErr("unauthorized", "User is not authenticated");

      const invite =
        (await this.invites.findValidByTokenHash(tokenHash, tx)) ??
        (await this.invites.findByTokenHash(tokenHash, tx));
      if (!invite || invite.expiresAt <= new Date()) {
        throw orgErr("invalid_invite", "Invite is invalid or expired");
      }

      if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
        throw orgErr(
          "invite_email_mismatch",
          "Invite email does not match authenticated user",
        );
      }
      await this.memberships.ensureMembership(
        {
          userId: user.id,
          organizationId: invite.organizationId,
          role: invite.role,
        },
        tx,
      );

      // If another concurrent request already accepted this invite, this remains
      // idempotent and succeeds for the same authenticated email.
      await this.invites.markAcceptedIfPending(invite.id, tx);
      await this.users.setActiveOrganization(user.id, invite.organizationId, tx);

      return { organizationId: invite.organizationId };
    });
  }

  async listPendingInvites(organizationId: string) {
    return this.invites.listPending(organizationId);
  }
}
