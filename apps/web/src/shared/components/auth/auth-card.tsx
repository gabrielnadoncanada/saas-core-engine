import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

export function AuthCard(props: {
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className='gap-4'>
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl font-extrabold">{props.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{props.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {props.children}
        {props.footer ? <div className="pt-2">{props.footer}</div> : null}
        <div className="pt-2">
          <Link href="/" className="text-xs text-muted-foreground underline">
            Back to home
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
