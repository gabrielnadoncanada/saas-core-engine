import "server-only";

import { AIChat } from "@/features/ai/ui/ai-chat";
import { requireUser } from "@/server/auth/require-user";

export default async function AIAssistantPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">AI Assistant</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Streaming assistant scoped to your active organization.
        </p>
      </div>
      <AIChat />
    </div>
  );
}
