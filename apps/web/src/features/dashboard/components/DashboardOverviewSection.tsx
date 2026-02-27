import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Overview } from "./overview";
import { RecentSales } from "./recent-sales";

export function DashboardOverviewSection() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
      <Card className="col-span-1 lg:col-span-4">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="ps-2">
          <Overview />
        </CardContent>
      </Card>
      <Card className="col-span-1 lg:col-span-3">
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>You made 265 sales this month.</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentSales />
        </CardContent>
      </Card>
    </div>
  );
}
