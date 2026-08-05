import React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell, LineChart, Line
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Building2,
  Wallet,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"

const monthlyTrendData = [
  { name: 'Jan', revenue: 45000, expense: 32000, profit: 13000 },
  { name: 'Feb', revenue: 52000, expense: 34000, profit: 18000 },
  { name: 'Mar', revenue: 48000, expense: 31000, profit: 17000 },
  { name: 'Apr', revenue: 61000, expense: 38000, profit: 23000 },
  { name: 'May', revenue: 59000, expense: 35000, profit: 24000 },
  { name: 'Jun', revenue: 67000, expense: 42000, profit: 25000 },
]

const budgetUtilizationData = [
  { name: 'Marketing', utilized: 85, remaining: 15 },
  { name: 'Operations', utilized: 60, remaining: 40 },
  { name: 'R&D', utilized: 92, remaining: 8 },
  { name: 'Sales', utilized: 45, remaining: 55 },
]

const approvalData = [
  { name: 'Approved', value: 400, color: '#10b981' },
  { name: 'Pending', value: 150, color: '#f59e0b' },
  { name: 'Rejected', value: 50, color: '#ef4444' },
]

export default function FinanceDashboard() {
  return (
    <div className="flex-1 space-y-6 pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Finance Dashboard</h2>
        <p className="text-muted-foreground mt-1">Enterprise financial overview and global metrics.</p>
      </div>

      {/* Top Level KPIs */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between space-x-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue</p>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold">$332k</span>
              <span className="text-xs text-emerald-500 font-medium flex items-center"><ArrowUpRight className="h-3 w-3" /> 12%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between space-x-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expense</p>
              <TrendingDown className="h-4 w-4 text-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold">$212k</span>
              <span className="text-xs text-rose-500 font-medium flex items-center"><ArrowUpRight className="h-3 w-3" /> 8%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between space-x-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Profit</p>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold">$120k</span>
              <span className="text-xs text-emerald-500 font-medium flex items-center"><ArrowUpRight className="h-3 w-3" /> 24%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between space-x-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receivables</p>
              <Building2 className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold">$109k</span>
              <span className="text-xs text-muted-foreground font-medium">Outstanding</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between space-x-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payables</p>
              <CreditCard className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold">$41k</span>
              <span className="text-xs text-muted-foreground font-medium">To clear</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between space-x-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cash Flow</p>
              <Wallet className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold">+$48k</span>
              <span className="text-xs text-emerald-500 font-medium flex items-center"><ArrowUpRight className="h-3 w-3" /> Net</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Revenue vs Expense Trend */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs Expense Trend</CardTitle>
            <CardDescription>6-month historical overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Approval Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Analytics</CardTitle>
            <CardDescription>Status of all financial requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={approvalData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {approvalData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Budget Utilization */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Utilization</CardTitle>
            <CardDescription>Departmental budget spend vs remaining</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetUtilizationData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#333" opacity={0.2} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} width={80} />
                  <RechartsTooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="utilized" name="Utilized (%)" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={20} />
                  <Bar dataKey="remaining" name="Remaining (%)" stackId="a" fill="#333" opacity={0.2} radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Net Profit Trend</CardTitle>
            <CardDescription>Monthly profit margins</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(value) => `$${value / 1000}k`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: "#8b5cf6" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
