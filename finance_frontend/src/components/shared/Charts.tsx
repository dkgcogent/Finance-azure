import React from "react"
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  LineChart, Line, 
  PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from "recharts"

export interface ChartBaseProps {
  data: any[]
  height?: number | string
  className?: string
  valueFormatter?: (value: number) => string
}

// Custom tooltip wrapper for consistent styling across all charts
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card text-card-foreground border rounded-lg shadow-lg p-3 text-sm z-50">
        {label && <p className="font-semibold mb-2 text-foreground">{label}</p>}
        {payload.map((entry: any, index: number) => {
          const val = formatter ? formatter(entry.value) : entry.value
          return (
            <div key={index} className="flex items-center gap-2 mt-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium text-foreground">{val}</span>
            </div>
          )
        })}
      </div>
    )
  }
  return null
}

// -----------------------------------------------------------------------------
// 1. AREA CHART
// -----------------------------------------------------------------------------
export interface AreaChartProps extends ChartBaseProps {
  series: { dataKey: string; name: string; color: string }[]
  xAxisKey: string
}

export function StandardAreaChart({ data, series, xAxisKey, valueFormatter, height = 300, className = "" }: AreaChartProps) {
  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={i} id={`color-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={s.color} stopOpacity={0}/>
              </linearGradient>
            ))}
          </defs>
          <XAxis dataKey={xAxisKey} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={valueFormatter} />
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.1} />
          <RechartsTooltip content={<CustomTooltip formatter={valueFormatter} />} cursor={{ stroke: '#888', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Legend />
          {series.map((s) => (
            <Area key={s.dataKey} type="monotone" dataKey={s.dataKey} name={s.name} stroke={s.color} fillOpacity={1} fill={`url(#color-${s.dataKey})`} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// -----------------------------------------------------------------------------
// 2. LINE CHART
// -----------------------------------------------------------------------------
export interface LineChartProps extends ChartBaseProps {
  series: { dataKey: string; name: string; color: string }[]
  xAxisKey: string
}

export function StandardLineChart({ data, series, xAxisKey, valueFormatter, height = 300, className = "" }: LineChartProps) {
  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey={xAxisKey} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={valueFormatter} />
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.1} />
          <RechartsTooltip content={<CustomTooltip formatter={valueFormatter} />} cursor={{ stroke: '#888', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Legend />
          {series.map((s) => (
            <Line key={s.dataKey} type="monotone" dataKey={s.dataKey} name={s.name} stroke={s.color} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// -----------------------------------------------------------------------------
// 3. BAR CHART (Supports Stacked)
// -----------------------------------------------------------------------------
export interface BarChartProps extends ChartBaseProps {
  series: { dataKey: string; name: string; color: string; stackId?: string }[]
  xAxisKey: string
  layout?: "horizontal" | "vertical"
}

export function StandardBarChart({ data, series, xAxisKey, valueFormatter, layout = "horizontal", height = 300, className = "" }: BarChartProps) {
  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={layout} margin={{ top: 10, right: 10, left: layout === 'vertical' ? 20 : 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={layout === 'horizontal'} vertical={layout === 'vertical'} stroke="#333" opacity={0.1} />
          {layout === 'horizontal' ? (
            <>
              <XAxis dataKey={xAxisKey} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={valueFormatter} />
            </>
          ) : (
            <>
              <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={valueFormatter} />
              <YAxis dataKey={xAxisKey} type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            </>
          )}
          <RechartsTooltip cursor={{fill: 'var(--muted)', opacity: 0.2}} content={<CustomTooltip formatter={valueFormatter} />} />
          <Legend />
          {series.map((s) => (
            <Bar key={s.dataKey} dataKey={s.dataKey} name={s.name} fill={s.color} stackId={s.stackId} radius={s.stackId ? [0,0,0,0] : [4,4,0,0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// -----------------------------------------------------------------------------
// 4. PIE / DONUT CHART
// -----------------------------------------------------------------------------
export interface PieChartProps extends ChartBaseProps {
  dataKey: string
  nameKey: string
  colors?: string[]
  variant?: "pie" | "donut"
}

export function StandardPieChart({ 
  data, 
  dataKey, 
  nameKey, 
  variant = "pie", 
  height = 300, 
  colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'], 
  className = "",
  valueFormatter
}: PieChartProps) {
  
  const innerRadius = variant === "donut" ? "60%" : 0

  return (
    <div className={`w-full flex justify-center ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius="80%"
            paddingAngle={variant === "donut" ? 5 : 0}
            dataKey={dataKey}
            nameKey={nameKey}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <RechartsTooltip content={<CustomTooltip formatter={valueFormatter} />} />
          <Legend verticalAlign="bottom" height={36}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
