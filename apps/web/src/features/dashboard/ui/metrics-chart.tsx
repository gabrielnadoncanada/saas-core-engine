"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";

type Point = { label: string; value: number };

export function MetricsChart(props: { data: Point[]; title: string; subtitle?: string }) {
  return (
    <Card className="rounded-3xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-extrabold">{props.title}</CardTitle>
        {props.subtitle ? <div className="text-xs text-muted-foreground">{props.subtitle}</div> : null}
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={props.data}>
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} width={30} />
            <Tooltip />
            <Area dataKey="value" strokeWidth={2} fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
