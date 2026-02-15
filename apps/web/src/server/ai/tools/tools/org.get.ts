import "server-only";
import { z } from "zod";
import type { AITool } from "@ai-core";
import { prisma } from "@db";

export const orgGetTool: AITool = {
  name: "org.get",
  description: "Get current organization details (name, createdAt).",
  schema: z.object({}),
  async execute(_args, ctx) {
    const org = await prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: { id: true, name: true, createdAt: true },
    });
    return { org };
  },
};
