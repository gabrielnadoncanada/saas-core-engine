import { SidebarNav } from "./sidebar-nav";
import { Topbar } from "./topbar";

export function AppShell(props: { title?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="grid grid-cols-[280px_1fr]">
        <aside className="hidden h-screen border-r bg-card md:block">
          <div className="h-full p-4">
            <SidebarNav />
          </div>
        </aside>

        <div className="min-w-0">
          <Topbar title={props.title ?? "Dashboard"} />
          <main className="p-6">{props.children}</main>
        </div>
      </div>
    </div>
  );
}
