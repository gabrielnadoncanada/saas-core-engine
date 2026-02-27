import { DashboardKpiCards } from "./DashboardKpiCards";
import { DashboardOverviewSection } from "./DashboardOverviewSection";

export function DashboardOverviewTab() {
  return (
    <div className="space-y-4">
      <DashboardKpiCards />
      <DashboardOverviewSection />
    </div>
  );
}
