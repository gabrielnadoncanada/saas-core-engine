import { DocsLayout } from "@/features/docs/ui";

export default function ChangelogPage() {
  return (
    <DocsLayout title="Changelog" subtitle="Template updates and releases.">
      <h2>v1.0.0</h2>
      <ul>
        <li>Auth: password, reset</li>
        <li>Google OAuth + account linking</li>
        <li>Organizations + invites</li>
        <li>Stripe subscriptions + portal</li>
        <li>Sessions revoke</li>
        <li>ShadCN + dark mode</li>
        <li>Demo seed + widgets</li>
      </ul>
    </DocsLayout>
  );
}
