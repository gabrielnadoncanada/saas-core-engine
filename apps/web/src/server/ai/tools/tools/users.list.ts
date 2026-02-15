import "server-only";
import { z } from "zod";
import type { AITool } from "@ai-core";
import { prisma } from "@db";

export const usersListTool: AITool = {
  name: "users.list",
  description: "List users in the current organization (email + role).",
  schema: z.object({ limit: z.number().int().min(1).max(50).default(10) }),
  async execute(args, ctx) {
    const memberships = await prisma.membership.findMany({
      where: { organizationId: ctx.orgId },
      take: args.limit,
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
