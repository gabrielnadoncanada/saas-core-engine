import "server-only";

import { prisma } from "@db";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/require-user";
import { routes } from "@/shared/constants/routes";
import { SearchProvider } from "@/shared/context/search-provider";
import { LayoutProvider } from "@/shared/context/layout-provider";
import { SidebarInset, SidebarProvider } from "@/shared/components/ui/sidebar";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { getCookie } from "@/shared/lib/cookies";
import { SkipToMain } from "@/shared/components/skip-to-main";
import { AppSidebar } from "@/shared/components/layout/app-sidebar";
import { cn } from "@/shared/lib/utils";

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export default async function DashboardLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('sidebar_state') !== 'false'
  const session = await requireUser({ redirect: true });
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { emailVerifiedAt: true },
  });

  if (!user?.emailVerifiedAt) {
    redirect(routes.auth.verifyEmail);
  }

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
  );
}
