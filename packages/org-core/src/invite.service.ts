import { InvitationsRepo, MembershipsRepo, UsersRepo, withTx } from "@db";
import { randomTokenBase64Url } from "@auth-core/src/hashing/random";
import { hashToken } from "@auth-core/src/hashing/token";

export class InviteService {
  constructor(
    private readonly invites = new InvitationsRepo(),
    private readonly users = new UsersRepo(),
    private readonly memberships = new MembershipsRepo(),
  ) {}

  async createInvite(params: {
    organizationId: string;
    inviterUserId: string;
    email: string;
    role: "admin" | "member";
    pepper: string;
    ttlMinutes: number;
  }) {
    const rawToken = randomTokenBase64Url(32);
    const tokenHash = hashToken(rawToken, params.pepper);

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

  async acceptInvite(params: {
    token: string;
    pepper: string;
    acceptUserId: string;
  }) {
    const tokenHash = hashToken(params.token, params.pepper);

    return withTx(async (tx) => {
      const invite = await this.invites.findValidByTokenHash(tokenHash, tx);
      if (!invite) throw new Error("INVALID_INVITE");

      // Ensure accepting user email matches invite email (optional, but recommended)
      const user = await this.users.findById(params.acceptUserId, tx);
      if (!user) throw new Error("UNAUTHORIZED");

      if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
        throw new Error("INVITE_EMAIL_MISMATCH");
      }

      // Create membership (idempotent)
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
