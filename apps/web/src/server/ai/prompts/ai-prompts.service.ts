import "server-only";

import { prisma } from "@db";

export async function ensurePrompt(
  orgId: string,
  key: string,
  defaultContent: string,
) {
  // Ensure prompt row exists
  const prompt = await prisma.aIPrompt.upsert({
    where: { organizationId_key: { organizationId: orgId, key } },
    create: {
      organizationId: orgId,
      key,
      activeVersion: 1,
      versions: {
        create: [{ version: 1, content: defaultContent }],
      },
    },
    update: {},
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });

  // If prompt existed but has no versions (shouldn't happen), heal it
  const latest = await prisma.aIPromptVersion.findFirst({
    where: { promptId: prompt.id },
    orderBy: { version: "desc" },
  });

  if (!latest) {
    await prisma.aIPromptVersion.create({
      data: { promptId: prompt.id, version: 1, content: defaultContent },
    });
    await prisma.aIPrompt.update({
      where: { id: prompt.id },
      data: { activeVersion: 1 },
    });
  }

  return prompt;
}

export async function getActivePromptContent(
  orgId: string,
  key: string,
  defaultContent: string,
) {
  const prompt = await ensurePrompt(orgId, key, defaultContent);

  const active = await prisma.aIPromptVersion.findFirst({
    where: { promptId: prompt.id, version: prompt.activeVersion },
    select: { content: true },
  });

  return active?.content ?? defaultContent;
}

export async function listPromptVersions(orgId: string, key: string) {
  const prompt = await prisma.aIPrompt.findUnique({
    where: { organizationId_key: { organizationId: orgId, key } },
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

export async function createPromptVersion(
  orgId: string,
  key: string,
  content: string,
  createdById?: string,
) {
  const prompt = await prisma.aIPrompt.findUnique({
    where: { organizationId_key: { organizationId: orgId, key } },
    select: { id: true },
  });

  if (!prompt) {
    // create base prompt with v1 then create v2
    const created = await prisma.aIPrompt.create({
      data: {
        organizationId: orgId,
        key,
        activeVersion: 1,
        versions: { create: [{ version: 1, content }] },
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
      content,
      createdById: createdById ?? null,
    },
  });

  await prisma.aIPrompt.update({
    where: { id: prompt.id },
    data: { activeVersion: nextVersion },
  });

  return { promptId: prompt.id, newVersion: nextVersion };
}

export async function setActivePromptVersion(
  orgId: string,
  key: string,
  version: number,
) {
  const prompt = await prisma.aIPrompt.findUnique({
    where: { organizationId_key: { organizationId: orgId, key } },
    select: { id: true },
  });
  if (!prompt) throw new Error("Prompt not found");

  const exists = await prisma.aIPromptVersion.findFirst({
    where: { promptId: prompt.id, version },
    select: { id: true },
  });
  if (!exists) throw new Error("Version not found");

  await prisma.aIPrompt.update({
    where: { id: prompt.id },
    data: { activeVersion: version },
  });
}
