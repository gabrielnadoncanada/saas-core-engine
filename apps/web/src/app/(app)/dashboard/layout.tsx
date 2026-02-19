import "server-only";

import { requireUser } from "@/server/auth/require-user";
import { AppShell } from "@/shared/components/layout/app-shell";

export default async function DashboardLayout(props: { children: React.ReactNode }) {
  await requireUser();

  return <AppShell title="Dashboard">{props.children}</AppShell>;
}
