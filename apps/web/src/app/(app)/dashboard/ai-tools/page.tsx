import "server-only";
import { AIToolsDemo } from "@/features/ai-tools/ui/ai-tools-demo";
import { requireUser } from "@/server/auth/require-user";

export default async function AIToolsPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">AI Tools (Tools-lite)</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One-shot tool calling: the model selects a tool, the server executes it safely, and the assistant explains the result.
        </p>
      </div>

      <AIToolsDemo />
    </div>
  );
}
