import Link from "next/link";
import { Card, CardContent } from "@/shared/ui/shadcn/card";

export function DocCard(props: { title: string; desc: string; href: string }) {
  return (
    <Link href={props.href}>
      <Card className="rounded-2xl transition hover:bg-muted/40">
        <CardContent className="p-6">
          <div className="text-sm font-extrabold">{props.title}</div>
          <p className="mt-2 text-sm text-muted-foreground">{props.desc}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
