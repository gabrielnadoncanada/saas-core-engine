import "server-only";

import { prisma } from "@db";
import { getDefaultOrgIdForUser } from "@/server/auth/require-org";
import { requireUser } from "@/server/auth/require-user";
import { Main } from "@/shared/components/layout/shell/main";
import { PageHeader } from "@/shared/components/layout/shell/page-header";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { Analytics } from "@/features/dashboard/components/analytics";
import { DashboardOverviewTab } from "@/features/dashboard/components/DashboardOverviewTab";

export default async function DashboardHomePage() {
  const sessionUser = await requireUser();
  const orgId = await getDefaultOrgIdForUser();

  const user = await prisma.user.findUnique({ where: { id: sessionUser.userId } });
  const org = orgId ? await prisma.organization.findUnique({ where: { id: orgId } }) : null;
  const sub = orgId ? await prisma.subscription.findUnique({ where: { organizationId: orgId } }) : null;

  const teamSize = orgId
    ? await prisma.membership.count({ where: { organizationId: orgId } })
    : 0;

  return (
    <Main>
      <PageHeader
        className='mb-4'
        title='Dashboard'
        actions={<Button>Download</Button>}
      />
      <Tabs
        defaultValue='overview'
        className='space-y-4'
      >
        <div className='w-full overflow-x-auto pb-2'>
          <TabsList>
            <TabsTrigger value='overview'>Overview</TabsTrigger>
            <TabsTrigger value='analytics'>Analytics</TabsTrigger>
            <TabsTrigger value='reports' disabled>
              Reports
            </TabsTrigger>
            <TabsTrigger value='notifications' disabled>
              Notifications
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value='overview' className='space-y-4'>
          <DashboardOverviewTab />
        </TabsContent>
        <TabsContent value='analytics' className='space-y-4'>
          <Analytics />
        </TabsContent>
      </Tabs>
    </Main>
  );
}
