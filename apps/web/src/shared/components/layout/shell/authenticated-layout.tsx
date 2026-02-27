import { getCookie } from '@/shared/lib/cookies'
import { cn } from '@/shared/lib/utils'
import { LayoutProvider } from '@/shared/context/layout-provider'
import { SearchProvider } from '@/shared/context/search-provider'
import { SidebarInset, SidebarProvider } from '@/shared/components/ui/sidebar'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { AppSidebar } from '@/shared/components/layout/shell/app-sidebar'
import { SkipToMain } from '@/shared/components/a11y/skip-to-main'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('sidebar_state') !== 'false'
  return (
    <SearchProvider>
      <LayoutProvider>
        <TooltipProvider>
          <SidebarProvider defaultOpen={defaultOpen}>
            <SkipToMain />
            <AppSidebar />
            <SidebarInset
              className={cn(
                // Set content container, so we can use container queries
                '@container/content',

                // If layout is fixed, set the height
                // to 100svh to prevent overflow
                'has-data-[layout=fixed]:h-svh',

                // If layout is fixed and sidebar is inset,
                // set the height to 100svh - spacing (total margins) to prevent overflow
                'peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]'
              )}
            >
              {children}
            </SidebarInset>
          </SidebarProvider>
        </TooltipProvider>
      </LayoutProvider>
    </SearchProvider>
  )
}
