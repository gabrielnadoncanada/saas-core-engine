'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Monitor, Shield, UserCog, Wrench, type LucideIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '@/shared/components/ui/button'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { type SidebarNavItem } from '../model/sidebar-data'

type SidebarNavProps = React.HTMLAttributes<HTMLElement> & {
  items: SidebarNavItem[]
}

const sidebarIcons: Record<SidebarNavItem['icon'], LucideIcon> = {
  'user-cog': UserCog,
  wrench: Wrench,
  shield: Shield,
  monitor: Monitor,
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [value, setValue] = useState(pathname)

  useEffect(() => {
    setValue(pathname)
  }, [pathname])

  const handleSelect = (nextHref: string) => {
    setValue(nextHref)
    router.push(nextHref)
  }

  return (
    <>
      <div className='p-1 md:hidden'>
        <Select value={value} onValueChange={handleSelect}>
          <SelectTrigger className='h-12 sm:w-48'>
            <SelectValue placeholder='Select section' />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => {
              const Icon = sidebarIcons[item.icon]
              return (
                <SelectItem key={item.href} value={item.href}>
                  <div className='flex gap-x-4 px-2 py-1'>
                    <span className='scale-125'><Icon /></span>
                    <span className='text-md'>{item.title}</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea
        type='always'
        className='hidden w-full min-w-40 bg-background px-1 py-2 md:block'
      >
        <nav
          className={cn(
            'flex space-x-2 py-1 lg:flex-col lg:space-y-1 lg:space-x-0',
            className
          )}
          {...props}
        >
          {items.map((item) => {
            const Icon = sidebarIcons[item.icon]
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  buttonVariants({ variant: 'ghost' }),
                  pathname === item.href
                    ? 'bg-muted hover:bg-accent'
                    : 'hover:bg-accent hover:underline',
                  'justify-start'
                )}
              >
                <span className='me-2'><Icon /></span>
                {item.title}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </>
  )
}
