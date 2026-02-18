import { prisma } from "@db";

export class AIPromptsRepo {
  async ensurePrompt(params: {
    organizationId: string;
    key: string;
    defaultContent: string;
  }): Promise<{ promptId: string; activeVersion: number }> {
    const prompt = await prisma.aIPrompt.upsert({
      where: {
        organizationId_key: {
          organizationId: params.organizationId,
          key: params.key,
        },
      },
      create: {
        organizationId: params.organizationId,
        key: params.key,
        activeVersion: 1,
        versions: {
          create: [{ version: 1, content: params.defaultContent }],
        },
      },
      update: {},
      select: { id: true, activeVersion: true },
    });

    const latest = await prisma.aIPromptVersion.findFirst({
      where: { promptId: prompt.id },
      orderBy: { version: "desc" },
      select: { id: true },
    });

    if (!latest) {
      await prisma.aIPromptVersion.create({
        data: { promptId: prompt.id, version: 1, content: params.defaultContent },
      });
      await prisma.aIPrompt.update({
        where: { id: prompt.id },
        data: { activeVersion: 1 },
      });
    }

    return { promptId: prompt.id, activeVersion: prompt.activeVersion };
  }

  async getActivePromptContent(params: {
    organizationId: string;
    key: string;
    defaultContent: string;
  }): Promise<string> {
    const prompt = await this.ensurePrompt(params);
    const active = await prisma.aIPromptVersion.findFirst({
      where: { promptId: prompt.promptId, version: prompt.activeVersion },
      select: { content: true },
    });
    return active?.content ?? params.defaultContent;
  }

  async listPromptVersions(params: { organizationId: string; key: string }) {
    const prompt = await prisma.aIPrompt.findUnique({
      where: {
        organizationId_key: {
          organizationId: params.organizationId,
          key: params.key,
        },
      },
      select: { id: true, activeVersion: true },
    });
    if (!prompt) return null;

    const versions = await prisma.aIPromptVersion.findMany({
      where: { promptId: prompt.id },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        content: true,
        createdAt: true,
        createdById: true,
      },
    });
    return { promptId: prompt.id, activeVersion: prompt.activeVersion, versions };
  }

  async createPromptVersion(params: {
    organizationId: string;
    key: string;
    content: string;
    createdById?: string;
  }) {
    const prompt = await prisma.aIPrompt.findUnique({
      where: {
        organizationId_key: {
          organizationId: params.organizationId,
          key: params.key,
        },
      },
      select: { id: true },
    });

    if (!prompt) {
      const created = await prisma.aIPrompt.create({
        data: {
          organizationId: params.organizationId,
          key: params.key,
          activeVersion: 1,
          versions: { create: [{ version: 1, content: params.content }] },
        },
        select: { id: true },
      });
      return { promptId: created.id, newVersion: 1 };
    }

    const latest = await prisma.aIPromptVersion.findFirst({
      where: { promptId: prompt.id },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    await prisma.aIPromptVersion.create({
      data: {
        promptId: prompt.id,
        version: nextVersion,
        content: params.content,
        createdById: params.createdById ?? null,
      },
    });
    await prisma.aIPrompt.update({
      where: { id: prompt.id },
      data: { activeVersion: nextVersion },
    });

    return { promptId: prompt.id, newVersion: nextVersion };
  }

  async setActivePromptVersion(params: {
    organizationId: string;
    key: string;
    version: number;
  }) {
    const prompt = await prisma.aIPrompt.findUnique({
      where: {
        organizationId_key: {
          organizationId: params.organizationId,
          key: params.key,
        },
      },
      select: { id: true },
    });
    if (!prompt) throw new Error("Prompt not found");

    const exists = await prisma.aIPromptVersion.findFirst({
      where: { promptId: prompt.id, version: params.version },
      select: { id: true },
    });
    if (!exists) throw new Error("Version not found");

    await prisma.aIPrompt.update({
      where: { id: prompt.id },
      data: { activeVersion: params.version },
    });
  }
}

