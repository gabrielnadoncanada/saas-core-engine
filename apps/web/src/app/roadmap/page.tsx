import { DocsLayout } from "@/features/docs/ui";

export default function RoadmapPage() {
  return (
    <DocsLayout title="Roadmap" subtitle="What’s coming next.">
      <h2>Next releases</h2>
      <ul>
        <li>Mobile sidebar drawer</li>
        <li>Org switcher</li>
      </ul>

      <p>
        Want a feature prioritized? Email us after purchase.
      </p>
    </DocsLayout>
  );
}
