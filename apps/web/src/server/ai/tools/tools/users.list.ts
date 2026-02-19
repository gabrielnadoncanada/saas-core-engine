import "server-only";
import { prisma } from "@db";
import { z } from "zod";

import type { AITool } from "@ai-core";

export const usersListTool: AITool = {
  name: "users.list",
  description: "List users in the current organization (email + role).",
  schema: z.object({ limit: z.number().int().min(1).max(50).default(10) }),
  timeoutMs: 2500,
  retries: 1,
  authorize: (ctx) => Boolean(ctx.orgId && ctx.userId),
  async execute(args, ctx) {
    const parsed = z
      .object({ limit: z.number().int().min(1).max(50).default(10) })
      .parse(args);
    const memberships = await prisma.membership.findMany({
      where: { organizationId: ctx.orgId },
      take: parsed.limit,
      orderBy: { createdAt: "desc" },
      select: { role: true, user: { select: { email: true, id: true } } },
    });

    return {
      users: memberships.map((m) => ({
        id: m.user.id,
        email: m.user.email,
        role: m.role,
      })),
    };
  },
};
