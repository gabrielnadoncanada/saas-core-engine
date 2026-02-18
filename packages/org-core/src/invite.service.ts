import type { InviteRole } from "@contracts";
import { isUniqueConstraintViolation, orgErr } from "./errors";
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
      const invite = await this.invites.findValidByTokenHash(tokenHash, tx);
      if (!invite) throw orgErr("invalid_invite", "Invite is invalid or expired");

      const user = await this.users.findById(params.acceptUserId, tx);
      if (!user) throw orgErr("unauthorized", "User is not authenticated");

      if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
        throw orgErr(
          "invite_email_mismatch",
          "Invite email does not match authenticated user",
        );
      }
      try {
        await this.memberships.ensureMembership(
          {
            userId: user.id,
            organizationId: invite.organizationId,
            role: invite.role,
          },
          tx,
        );
      } catch (error) {
        if (!isUniqueConstraintViolation(error)) throw error;
      }

      await this.invites.markAcceptedIfPending(invite.id, tx);
      await this.users.setActiveOrganization(user.id, invite.organizationId, tx);

      return { organizationId: invite.organizationId };
    });
  }

  async listPendingInvites(organizationId: string) {
    return this.invites.listPending(organizationId);
  }
}
