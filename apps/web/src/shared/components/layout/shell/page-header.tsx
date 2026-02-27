import { cn } from '@/shared/lib/utils'

type PageHeaderProps = React.HTMLAttributes<HTMLDivElement> & {
  title: React.ReactNode
  description?: React.ReactNode
  before?: React.ReactNode
  actions?: React.ReactNode
  after?: React.ReactNode
}

export function PageHeader({
  className,
  title,
  description,
  before,
  actions,
  after,
  ...props
}: PageHeaderProps) {
  return (
    <section className={cn('space-y-4', className)} {...props}>
      {before}
      <div className='flex flex-wrap items-end justify-between gap-2'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>{title}</h2>
          {description ? (
            <p className='text-muted-foreground'>{description}</p>
          ) : null}
        </div>
        {actions ? <div className='flex gap-2'>{actions}</div> : null}
      </div>
      {after}
    </section>
  )
}
