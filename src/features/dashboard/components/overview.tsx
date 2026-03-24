import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type OverviewDatum = {
  /**
   * Label for the x-axis (e.g. day of month like "01", "02", ...)
   */
  name: string
  /**
   * Total revenue for this bucket (already aggregated)
   */
  revenue: number
  /**
   * Total expenses for this bucket (already aggregated)
   */
  expenses: number
}

interface OverviewProps {
  data: OverviewDatum[]
}

export function Overview({ data }: OverviewProps) {
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
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip
          formatter={(value: number | string | undefined, key: string | undefined) => {
            const label = key === 'revenue' ? 'Revenue' : 'Expenses'
            const num = typeof value === 'number' ? value : Number(value ?? 0)
            return [`${num.toLocaleString()}`, label]
          }}
        />
        <Bar
          dataKey='revenue'
          name='Revenue'
          radius={[4, 4, 0, 0]}
          className='fill-primary'
        />
        <Bar
          dataKey='expenses'
          name='Expenses'
          radius={[4, 4, 0, 0]}
          className='fill-destructive/70'
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

