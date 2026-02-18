export interface AIPromptsRepo {
  ensurePrompt(params: {
    organizationId: string;
    key: string;
    defaultContent: string;
  }): Promise<{ promptId: string; activeVersion: number }>;
  getActivePromptContent(params: {
    organizationId: string;
    key: string;
    defaultContent: string;
  }): Promise<string>;
  listPromptVersions(params: {
    organizationId: string;
    key: string;
  }): Promise<{
    promptId: string;
    activeVersion: number;
    versions: Array<{
      id: string;
      version: number;
      content: string;
      createdAt: Date;
      createdById: string | null;
    }>;
  } | null>;
  createPromptVersion(params: {
    organizationId: string;
    key: string;
    content: string;
    createdById?: string;
  }): Promise<{ promptId: string; newVersion: number }>;
  setActivePromptVersion(params: {
    organizationId: string;
    key: string;
    version: number;
  }): Promise<void>;
}

export class AIPromptsService {
  constructor(private readonly repo: AIPromptsRepo) {}

  ensurePrompt(orgId: string, key: string, defaultContent: string) {
    return this.repo.ensurePrompt({
      organizationId: orgId,
      key,
      defaultContent,
    });
  }

  getActivePromptContent(orgId: string, key: string, defaultContent: string) {
    return this.repo.getActivePromptContent({
      organizationId: orgId,
      key,
      defaultContent,
    });
  }

  listPromptVersions(orgId: string, key: string) {
    return this.repo.listPromptVersions({ organizationId: orgId, key });
  }

  createPromptVersion(
    orgId: string,
    key: string,
    content: string,
    createdById?: string,
  ) {
    return this.repo.createPromptVersion({
      organizationId: orgId,
      key,
      content,
      createdById,
    });
  }

  setActivePromptVersion(orgId: string, key: string, version: number) {
    return this.repo.setActivePromptVersion({
      organizationId: orgId,
      key,
      version,
    });
  }
}

