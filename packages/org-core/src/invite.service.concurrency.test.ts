import { describe, expect, it } from "vitest";
import type { InvitationSummary } from "@contracts";
import { InviteService } from "./invite.service";
import type {
  InviteToken,
  InvitationsRepo,
  MembershipsRepo,
  TxRunner,
  UsersRepo,
} from "./org.ports";

class Barrier {
  private count = 0;
  private resolver: (() => void) | null = null;
  private readonly promise = new Promise<void>((resolve) => {
    this.resolver = resolve;
  });

  async wait(target: number): Promise<void> {
    this.count += 1;
    if (this.count >= target) {
      this.resolver?.();
    }
    await this.promise;
  }
}

function passThroughTxRunner(): TxRunner {
  return {
    withTx: async <T>(fn: (tx: unknown) => Promise<T>) => fn({}),
  };
}

function tokenAdapter(): InviteToken {
  return {
    randomToken: () => "unused",
    hashToken: (raw) => `hash:${raw}`,
  };
}

describe("InviteService concurrency", () => {
  it("is idempotent for concurrent accepts of the same invite", async () => {
    const barrier = new Barrier();

    const inviteRecord: InvitationSummary = {
      id: "inv_1",
      organizationId: "org_1",
      email: "member@example.com",
      role: "member" as const,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
    };

    const invites: InvitationsRepo = {
      create: async () => inviteRecord,
      findValidByTokenHash: async (tokenHash) => {
        if (tokenHash !== "hash:token") return null;
        await barrier.wait(2);
        return inviteRecord.acceptedAt ? null : inviteRecord;
      },
      findByTokenHash: async (tokenHash) => {
        if (tokenHash !== "hash:token") return null;
        return inviteRecord;
      },
      markAcceptedIfPending: async () => {
        if (inviteRecord.acceptedAt) return false;
        inviteRecord.acceptedAt = new Date();
        return true;
      },
      listPending: async () => [],
    };

    const users: UsersRepo = {
      findById: async () => ({ id: "u_1", email: "member@example.com" }),
      setActiveOrganization: async () => {},
    };

    const seen = new Set<string>();
    const memberships: MembershipsRepo = {
      create: async () => ({ id: "m_created" }),
      findUserMembership: async () => null,
      ensureMembership: async ({ userId, organizationId }) => {
        const key = `${userId}:${organizationId}`;
        seen.add(key);
        return { id: "m_1" };
      },
      findById: async () => null,
      countByRole: async () => 0,
      updateRole: async () => {},
      remove: async () => {},
      listOrgMembers: async () => [],
      listUserOrganizations: async () => [],
    };

    const svc = new InviteService(
      invites,
      users,
      memberships,
      passThroughTxRunner(),
      tokenAdapter(),
    );

    const [a, b] = await Promise.all([
      svc.acceptInvite({ token: "token", acceptUserId: "u_1" }),
      svc.acceptInvite({ token: "token", acceptUserId: "u_1" }),
    ]);

    expect(a.organizationId).toBe("org_1");
    expect(b.organizationId).toBe("org_1");
    expect(seen.size).toBe(1);
  });
});
