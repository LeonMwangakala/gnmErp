import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type AnalyticsDatum = {
  /**
   * Label like 'Jan', 'Feb', ...
   */
  name: string
  /**
   * Total revenue for the period.
   */
  revenue: number
  /**
   * Total expenses for the period.
   */
  expenses: number
}

interface AnalyticsChartProps {
  data: AnalyticsDatum[]
  isLoading: boolean
}

export function AnalyticsChart({ data, isLoading }: AnalyticsChartProps) {
  if (isLoading) {
    return (
      <div className='flex h-[300px] items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-transparent' />
      </div>
    )
  }

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
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip
          formatter={(value: number, key: string) => {
            const label = key === 'revenue' ? 'Revenue' : 'Expenses'
            return [`${value.toLocaleString()}`, label]
          }}
        />
        <Area
          type='monotone'
          dataKey='revenue'
          name='Revenue'
          stroke='currentColor'
          className='text-primary'
          fill='currentColor'
          fillOpacity={0.15}
        />
        <Area
          type='monotone'
          dataKey='expenses'
          name='Expenses'
          stroke='currentColor'
          className='text-muted-foreground'
          fill='currentColor'
          fillOpacity={0.1}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
