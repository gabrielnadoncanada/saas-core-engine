import "server-only";
import { AIPromptsPanel } from "@/features/ai-prompts/ui/ai-prompts-panel";
import { requireUser } from "@/server/auth/require-user";

export default async function AIPromptsPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">AI Prompts</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Versioned prompt registry. Create new versions and rollback instantly.
        </p>
      </div>

      <AIPromptsPanel />
    </div>
  );
}
