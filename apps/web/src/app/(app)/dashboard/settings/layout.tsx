import { Main } from "@/shared/components/layout/shell/main";
import { PageHeader } from "@/shared/components/layout/shell/page-header";
import { Separator } from "@/shared/components/ui/separator";
import { SidebarNav } from "@/features/settings/shared/ui/SidebarNav";
import { sidebarNavItems } from "@/features/settings/shared/data/sidebar-nav-items";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Main fixed>
      <PageHeader
        title='Settings'
        description='Manage your account settings and preferences.'
      />
      <Separator className='mb-4 lg:mb-6' />
      <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12'>
        <aside className='top-0 lg:sticky lg:w-1/5'>
          <SidebarNav items={sidebarNavItems} />
        </aside>
        <div className='flex w-full overflow-y-hidden p-1'>
          {children}
        </div>
      </div>
    </Main>
  );
}
