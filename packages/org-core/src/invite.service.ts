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
    if (!inviterMembership || inviterMembership.role === "member") {
      throw orgErr("forbidden", "Only elevated roles can invite members");
    }

    const existingPending = await this.invites.findPendingByEmail({
      organizationId: params.organizationId,
      email: params.email,
    });
    if (existingPending) {
      await this.invites.revokeIfPending(existingPending.id);
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
      if (!invite) {
        throw orgErr("invalid_invite", "Invite is invalid");
      }
      if (invite.acceptedAt) {
        throw orgErr("invite_already_accepted", "Invite was already accepted");
      }
      if (invite.expiresAt <= new Date()) {
        throw orgErr("invite_expired", "Invite has expired");
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

  async revokeInvite(params: {
    actorUserId: string;
    organizationId: string;
    invitationId: string;
  }) {
    const actorMembership = await this.memberships.findUserMembership({
      userId: params.actorUserId,
      organizationId: params.organizationId,
    });
    if (!actorMembership || actorMembership.role === "member") {
      throw orgErr("forbidden", "Only elevated roles can revoke invites");
    }

    const invite = await this.invites.findById(params.invitationId);
    if (!invite || invite.organizationId !== params.organizationId) {
      throw orgErr("forbidden", "Invitation not found in organization");
    }
    if (invite.acceptedAt) {
      throw orgErr("invalid_invite", "Invitation is already accepted");
    }

    await this.invites.revokeIfPending(invite.id);
  }

  async getInviteForToken(token: string) {
    const tokenHash = this.inviteToken.hashToken(token);
    const invite = await this.invites.findByTokenHash(tokenHash);
    if (!invite) {
      return { status: "invalid" as const };
    }
    if (invite.acceptedAt) {
      return { status: "accepted" as const };
    }
    if (invite.expiresAt <= new Date()) {
      return { status: "expired" as const };
    }
    return {
      status: "pending" as const,
      invite,
    };
  }
}
