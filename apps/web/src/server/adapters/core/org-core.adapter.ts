import { randomBytes } from "node:crypto";

import { hashToken } from "@auth-core";
import { withTx } from "@db";
import { InviteService, MembershipService, OrgService } from "@org-core";

import { env } from "@/server/config/env";
import { InvitationsRepo } from "@/server/db-repos/invitations.repo";
import { MembershipsRepo } from "@/server/db-repos/memberships.repo";
import { OrgsRepo } from "@/server/db-repos/orgs.repo";
import { SubscriptionsRepo } from "@/server/db-repos/subscriptions.repo";
import { UsersRepo } from "@/server/db-repos/users.repo";

const txRunner = { withTx };

function randomTokenBase64Url(size: number): string {
  return randomBytes(size).toString("base64url");
}

const inviteToken = {
  randomToken: () => randomTokenBase64Url(32),
  hashToken: (rawToken: string) => hashToken(rawToken, env.TOKEN_PEPPER),
};

export function createOrgService() {
  return new OrgService(
    new OrgsRepo(),
    new MembershipsRepo(),
    new SubscriptionsRepo(),
    new UsersRepo(),
    txRunner,
  );
}

export function createMembershipService() {
  return new MembershipService(new MembershipsRepo(), txRunner);
}

export function createInviteService() {
  return new InviteService(
    new InvitationsRepo(),
    new UsersRepo(),
    new MembershipsRepo(),
    txRunner,
    inviteToken,
  );
}
