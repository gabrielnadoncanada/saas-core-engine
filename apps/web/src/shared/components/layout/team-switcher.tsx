'use client'

import * as React from 'react'
import { ChevronsUpDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/shared/components/ui/sidebar'

type OrgOption = {
  organizationId: string
  name: string
}

type OrgListResponse = {
  ok: boolean
  activeOrganizationId?: string
  organizations?: OrgOption[]
}

export function TeamSwitcher() {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const [orgs, setOrgs] = React.useState<OrgOption[]>([])
  const [activeOrgId, setActiveOrgId] = React.useState<string>('')
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSwitching, setIsSwitching] = React.useState(false)

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/org/list', { cache: 'no-store' })
        const json = (await res.json()) as OrgListResponse
        const organizations = json.organizations ?? []

        setOrgs(organizations)
        const selectedId =
          json.activeOrganizationId ?? organizations[0]?.organizationId ?? ''
        setActiveOrgId(selectedId)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  async function onSwitch(nextOrgId: string) {
    if (!nextOrgId || nextOrgId === activeOrgId) return

    setIsSwitching(true)
    try {
      const res = await fetch('/api/org/switch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ organizationId: nextOrgId }),
      })

      if (!res.ok) return

      setActiveOrgId(nextOrgId)
      router.refresh()
    } finally {
      setIsSwitching(false)
    }
  }

  if (isLoading || orgs.length <= 1) return null

  const activeOrg =
    orgs.find((org) => org.organizationId === activeOrgId) ?? orgs[0]
  const activeOrgInitial = activeOrg?.name?.charAt(0).toUpperCase() ?? 'O'

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              disabled={isSwitching}
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
                <span className='text-sm font-semibold'>{activeOrgInitial}</span>
              </div>
              <div className='grid flex-1 text-start text-sm leading-tight'>
                <span className='truncate font-semibold'>{activeOrg?.name}</span>
                <span className='truncate text-xs'>Workspace</span>
              </div>
              <ChevronsUpDown className='ms-auto' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className='text-xs text-muted-foreground'>
              Workspaces
            </DropdownMenuLabel>
            {orgs.map((org) => (
              <DropdownMenuItem
                key={org.organizationId}
                onClick={() => {
                  void onSwitch(org.organizationId)
                }}
                className='gap-2 p-2'
              >
                <div className='flex size-6 items-center justify-center rounded-sm border'>
                  <span className='text-xs font-semibold'>
                    {org.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                {org.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
