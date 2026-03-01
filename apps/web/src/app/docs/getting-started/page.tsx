import { CodeBlock, DocsLayout } from "@/features/docs/ui";

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
        Copy <code>apps/web/.env.example</code> to <code>apps/web/.env.local</code> and{" "}
        <code>packages/db/.env.example</code> to <code>packages/db/.env</code>.
      </p>

      <h2>3) Apply database migrations</h2>
      <CodeBlock>{`pnpm --filter ./packages/db exec prisma migrate deploy`}</CodeBlock>

      <h2>4) Run dev</h2>
      <CodeBlock>{`pnpm dev`}</CodeBlock>

      <h2>5) Test flows</h2>
      <ul>
        <li>Signup → dashboard</li>
        <li>Login → sessions page</li>
        <li>Google OAuth</li>
        <li>Invite teammate → accept invite</li>
        <li>Stripe checkout → webhook sync</li>
      </ul>
    </DocsLayout>
  );
}
