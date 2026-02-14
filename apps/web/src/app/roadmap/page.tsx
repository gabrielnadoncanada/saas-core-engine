import { DocsLayout } from "@/features/docs/ui/docs-layout";

export default function RoadmapPage() {
  return (
    <DocsLayout title="Roadmap" subtitle="What’s coming next.">
      <h2>Next releases</h2>
      <ul>
        <li>Mobile sidebar drawer</li>
        <li>Audit logs + activity events</li>
        <li>Org switcher</li>
        <li>AI Pack (optional)</li>
      </ul>

      <p>
        Want a feature prioritized? Email us after purchase.
      </p>
    </DocsLayout>
  );
}
