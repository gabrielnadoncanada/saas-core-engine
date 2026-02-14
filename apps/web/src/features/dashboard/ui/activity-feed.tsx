import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";

type Item = { title: string; detail: string; time: string };

export function ActivityFeed(props: { items: Item[] }) {
  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle className="text-sm font-extrabold">Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.items.map((x, i) => (
          <div key={i} className="flex items-start justify-between gap-4 rounded-2xl border p-3">
            <div>
              <div className="text-sm font-semibold">{x.title}</div>
              <div className="text-xs text-muted-foreground">{x.detail}</div>
            </div>
            <div className="text-xs text-muted-foreground">{x.time}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
