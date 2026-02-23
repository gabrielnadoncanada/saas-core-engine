import "server-only";

import { InviteMemberForm, PendingInvitesList, TeamMembersTable } from "@/features/team/ui";
import {
  createInviteService,
  createMembershipService,
} from "@/server/adapters/core/org-core.adapter";
import { getDefaultOrgIdForUser } from "@/server/auth/require-org";
import { requireUser } from "@/server/auth/require-user";

function resolveInviteMessage(inviteStatus?: string) {
  if (!inviteStatus) return null;
  if (inviteStatus === "accepted") return "Invitation accepted.";
  if (inviteStatus === "expired") return "Invitation expired. Ask an admin to resend it.";
  if (inviteStatus === "already_accepted") return "Invitation was already accepted.";
  if (inviteStatus === "email_mismatch") {
    return "This invitation belongs to another email address.";
  }
  if (inviteStatus === "invalid") return "Invitation is invalid.";
  return "Invitation could not be processed.";
}

export default async function TeamPage(props: {
  searchParams?: Promise<{ invite?: string | string[] }>;
}) {
  const user = await requireUser();
  const orgId = await getDefaultOrgIdForUser();
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const inviteStatus = Array.isArray(searchParams?.invite)
    ? searchParams?.invite[0]
    : searchParams?.invite;
  const inviteMessage = resolveInviteMessage(inviteStatus);

  if (!orgId) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Team</h1>
        <p>No organization found.</p>
      </div>
    );
  }

  const membershipService = createMembershipService();
  const inviteService = createInviteService();
  const [members, invites] = await Promise.all([
    membershipService.listOrgMembers(orgId),
    inviteService.listPendingInvites(orgId),
  ]);

  return (
    <div style={{ padding: 24, maxWidth: 980 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Team</h1>
      <p style={{ marginTop: 8, color: "#666" }}>
        Invite teammates and manage access. (User: {user.userId})
      </p>
      {inviteMessage ? (
        <p
          style={{
            marginTop: 8,
            color: "#444",
            background: "#f6f6f6",
            padding: "8px 10px",
            borderRadius: 8,
          }}
        >
          {inviteMessage}
        </p>
      ) : null}

      <div style={{ marginTop: 24 }}>
        <InviteMemberForm />
      </div>

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Members</h2>
        <TeamMembersTable
          members={members.map((m) => ({
            id: m.id,
            userId: m.userId,
            email: m.user.email,
            role: m.role,
            joinedAt: m.createdAt.toISOString(),
          }))}
          currentUserId={user.userId}
        />
      </div>

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Pending invites</h2>
        <PendingInvitesList
          invites={invites.map((invite) => ({
            id: invite.id,
            email: invite.email,
            role: invite.role,
            expiresAt: invite.expiresAt.toISOString(),
          }))}
          currentUserRole={members.find((m) => m.userId === user.userId)?.role ?? "member"}
        />
      </div>
    </div>
  );
}
