import "server-only";

import { requireUser } from "@/server/auth/require-user";
import { getDefaultOrgIdForUser } from "@/server/auth/require-org";
import {
  createInviteService,
  createMembershipService,
} from "@/server/adapters/core/org-core.adapter";
import { TeamMembersTable } from "@/features/team/ui/members-table";
import { InviteMemberForm } from "@/features/team/ui/invite-member-form";

export default async function TeamPage() {
  const user = await requireUser();
  const orgId = await getDefaultOrgIdForUser();

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
        <ul style={{ marginTop: 8 }}>
          {invites.length === 0 ? (
            <li style={{ color: "#666" }}>No pending invites.</li>
          ) : (
            invites.map((inv) => (
              <li key={inv.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
                {inv.email} — {inv.role} — expires {inv.expiresAt.toDateString()}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
