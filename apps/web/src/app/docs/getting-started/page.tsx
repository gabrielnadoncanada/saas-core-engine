import { CodeBlock } from "@/features/docs/ui/code-block";
import { DocsLayout } from "@/features/docs/ui/docs-layout";

export default function GettingStartedPage() {
  return (
    <DocsLayout
      title="Getting started"
      subtitle="Run the template locally in a few minutes."
    >
      <h2>1) Install</h2>
      <CodeBlock>{`pnpm i`}</CodeBlock>

      <h2>2) Configure env</h2>
      <p>
        Copy <code>.env.example</code> to <code>.env</code> and set the required variables (see Configuration docs).
      </p>

      <h2>3) Migrate database</h2>
      <CodeBlock>{`pnpm --filter @db exec prisma migrate dev`}</CodeBlock>

      <h2>4) Run dev</h2>
      <CodeBlock>{`pnpm dev`}</CodeBlock>

      <h2>5) Test flows</h2>
      <ul>
        <li>Signup → dashboard</li>
        <li>Login → sessions page</li>
        <li>Magic link (Resend or dev console)</li>
        <li>Google OAuth</li>
        <li>Invite teammate → accept invite</li>
        <li>Stripe checkout → webhook sync</li>
      </ul>
    </DocsLayout>
  );
}
