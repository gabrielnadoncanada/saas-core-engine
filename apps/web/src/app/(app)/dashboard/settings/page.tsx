import "server-only";

import { SettingsPageContent } from "@/features/settings";
import type { SettingsSearchParams } from "@/features/settings";

type PageProps = {
  searchParams?: Promise<SettingsSearchParams>;
};

export default async function SettingsPage(props: PageProps) {
  return <SettingsPageContent searchParams={props.searchParams} />;
}
