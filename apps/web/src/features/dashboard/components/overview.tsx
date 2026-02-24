'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

const data = [
  {
    name: 'Jan',
    total: 3200,
  },
  {
    name: 'Feb',
    total: 4100,
  },
  {
    name: 'Mar',
    total: 2800,
  },
  {
    name: 'Apr',
    total: 4600,
  },
  {
    name: 'May',
    total: 3800,
  },
  {
    name: 'Jun',
    total: 5200,
  },
  {
    name: 'Jul',
    total: 4900,
  },
  {
    name: 'Aug',
    total: 4300,
  },
  {
    name: 'Sep',
    total: 3600,
  },
  {
    name: 'Oct',
    total: 4700,
  },
  {
    name: 'Nov',
    total: 5400,
  },
  {
    name: 'Dec',
    total: 5900,
  },
]

export function Overview() {
  return (
    <ResponsiveContainer width='100%' height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey='name'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          direction='ltr'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Bar
          dataKey='total'
          fill='currentColor'
          radius={[4, 4, 0, 0]}
          className='fill-primary'
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
