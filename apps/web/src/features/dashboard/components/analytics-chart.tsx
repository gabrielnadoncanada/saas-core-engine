'use client'

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

const data = [
  {
    name: 'Mon',
    clicks: 420,
    uniques: 280,
  },
  {
    name: 'Tue',
    clicks: 510,
    uniques: 340,
  },
  {
    name: 'Wed',
    clicks: 470,
    uniques: 320,
  },
  {
    name: 'Thu',
    clicks: 620,
    uniques: 410,
  },
  {
    name: 'Fri',
    clicks: 700,
    uniques: 460,
  },
  {
    name: 'Sat',
    clicks: 390,
    uniques: 250,
  },
  {
    name: 'Sun',
    clicks: 450,
    uniques: 300,
  },
]

export function AnalyticsChart() {
  return (
    <ResponsiveContainer width='100%' height={300}>
      <AreaChart data={data}>
        <XAxis
          dataKey='name'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Area
          type='monotone'
          dataKey='clicks'
          stroke='currentColor'
          className='text-primary'
          fill='currentColor'
          fillOpacity={0.15}
        />
        <Area
          type='monotone'
          dataKey='uniques'
          stroke='currentColor'
          className='text-muted-foreground'
          fill='currentColor'
          fillOpacity={0.1}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
