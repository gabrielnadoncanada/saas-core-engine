import "server-only";
import { prisma } from "@db";
import { z } from "zod";

import type { AITool } from "@ai-core";

export const orgGetTool: AITool = {
  name: "org.get",
  description: "Get current organization details (name, createdAt).",
  schema: z.object({}),
  timeoutMs: 2000,
  retries: 1,
  authorize: (ctx) => Boolean(ctx.orgId && ctx.userId),
  async execute(_args, ctx) {
    z.object({}).parse(_args);
    const org = await prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: { id: true, name: true, createdAt: true },
    });
    return { org };
  },
};
