import React, { useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable, SortableHeader } from "@/components/shared/DataTable"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Plus, CheckCircle2, AlertTriangle, XCircle, TrendingUp } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  Cell
} from "recharts"

type ActualData = {
  id: string
  department: string
  category: string
  ActualAmount: number
  actualAmount: number
  variance: number
  variancePercentage: number
  status: "Under Actual" | "Over Actual" | "On Track"
}

const mockTableData: ActualData[] = [
  { id: "1", department: "Operations", category: "Fuel", ActualAmount: 150000, actualAmount: 142000, variance: 8000, variancePercentage: 5.3, status: "Under Actual" },
  { id: "2", department: "Operations", category: "Maintenance", ActualAmount: 80000, actualAmount: 85000, variance: -5000, variancePercentage: -6.25, status: "Over Actual" },
  { id: "3", department: "Admin", category: "Software Licenses", ActualAmount: 50000, actualAmount: 48000, variance: 2000, variancePercentage: 4, status: "On Track" },
  { id: "4", department: "Marketing", category: "Ad Campaigns", ActualAmount: 30000, actualAmount: 32000, variance: -2000, variancePercentage: -6.6, status: "Over Actual" },
  { id: "5", department: "Operations", category: "Tolls & Routing", ActualAmount: 40000, actualAmount: 38500, variance: 1500, variancePercentage: 3.75, status: "Under Actual" },
]

const monthlyData = [
  { name: "Actual", amount: 430000 },
  { name: "Actual", amount: 395000 }
]

const yoyData = [
  { name: "2022", Actual: 4200000, actual: 4100000 },
  { name: "2023", Actual: 4800000, actual: 4950000 },
  { name: "2024 (YTD)", Actual: 3500000, actual: 3400000 },
]

const yearlyData = [
  { name: "Jan", Actual: 350, actual: 340 },
  { name: "Feb", Actual: 360, actual: 355 },
  { name: "Mar", Actual: 370, actual: 365 },
  { name: "Apr", Actual: 380, actual: 390 },
  { name: "May", Actual: 390, actual: 385 },
  { name: "Jun", Actual: 400, actual: 410 },
  { name: "Jul", Actual: 410, actual: 395 },
  { name: "Aug", Actual: 420, actual: 415 },
  { name: "Sep", Actual: 430, actual: 425 },
]

export default function ActualVsActual() {
  const [month, setMonth] = useState("Current Month")
  const [year, setYear] = useState("2024")
  const [customer, setCustomer] = useState("All Customers")
  const [project, setProject] = useState("All Projects")

  const columns = useMemo<ColumnDef<ActualData>[]>(
    () => [
      {
        accessorKey: "department",
        header: ({ column }) => <SortableHeader column={column} title="Department" />,
        cell: ({ row }) => <div className="font-medium">{row.getValue("department")}</div>,
      },
      {
        accessorKey: "category",
        header: ({ column }) => <SortableHeader column={column} title="Category" />,
      },
      {
        accessorKey: "ActualAmount",
        header: ({ column }) => <SortableHeader column={column} title="Actual" />,
        cell: ({ row }) => {
          const amount = parseFloat(row.getValue("ActualAmount"))
          return <div className="text-right font-medium">${amount.toLocaleString()}</div>
        },
      },
      {
        accessorKey: "actualAmount",
        header: ({ column }) => <SortableHeader column={column} title="Actual" />,
        cell: ({ row }) => {
          const amount = parseFloat(row.getValue("actualAmount"))
          return <div className="text-right font-medium">${amount.toLocaleString()}</div>
        },
      },
      {
        accessorKey: "variance",
        header: ({ column }) => <SortableHeader column={column} title="Variance" />,
        cell: ({ row }) => {
          const amount = parseFloat(row.getValue("variance"))
          return (
            <div className={`text-right font-medium ${amount < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {amount < 0 ? '-' : '+'}${Math.abs(amount).toLocaleString()}
            </div>
          )
        },
      },
      {
        accessorKey: "variancePercentage",
        header: ({ column }) => <SortableHeader column={column} title="Var %" />,
        cell: ({ row }) => {
          const pct = parseFloat(row.getValue("variancePercentage"))
          return (
            <div className={`text-right ${pct < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
            </div>
          )
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string
          return (
            <Badge 
              variant={
                status === "Under Actual" ? "success" :
                status === "Over Actual" ? "destructive" :
                "secondary"
              }
            >
              {status}
            </Badge>
          )
        },
      },
    ],
    []
  )

  return (
    <div className="flex-1 space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Actual vs Actual</h2>
          <p className="text-muted-foreground mt-1">
            Compare Actualed expectations against actual expenditures and performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Actual
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Month</label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                <option>Current Month</option>
                <option>Previous Month</option>
                <option>January</option>
                <option>February</option>
                <option>March</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Year</label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option>2024</option>
                <option>2023</option>
                <option>2022</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Customer</label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
              >
                <option>All Customers</option>
                <option>Acme Corp</option>
                <option>Globex Inc</option>
                <option>Soylent Corp</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Project</label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={project}
                onChange={(e) => setProject(e.target.value)}
              >
                <option>All Projects</option>
                <option>Fleet Expansion</option>
                <option>Facility Upgrade</option>
                <option>IT Infrastructure</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variance Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Within Actual</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12 Categories</div>
            <p className="text-xs text-muted-foreground mt-1">
              Safely operating within allocated limits
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Near Limit</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4 Categories</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently exceeding 85% utilization
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Exceeded</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2 Categories</div>
            <p className="text-xs text-destructive mt-1 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              $7,000 total overspend
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Monthly */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Comparison</CardTitle>
            <CardDescription className="text-xs">Current month totals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis hide domain={[0, 'dataMax + 50000']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(v: any) => `$${Number(v).toLocaleString()}`}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {monthlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* YOY */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">YOY Comparison</CardTitle>
            <CardDescription className="text-xs">Actual vs Actual by Year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yoyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000000}M`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(v: any) => `$${Number(v).toLocaleString()}`}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Actual" name="Actual" fill="hsl(var(--muted))" radius={[2, 2, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="actual" name="Actual" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Yearly Trend */}
        <Card className="col-span-1 md:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">MOM for Current FY (Thousands)</CardTitle>
            <CardDescription className="text-xs">Month-over-month trajectory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yearlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(v: any) => `$${v}k`}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="Actual" name="Actual (Trend)" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" fill="none" strokeWidth={2} />
                  <Area type="monotone" dataKey="actual" name="Actual" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorActual)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Department Analysis</CardTitle>
          <CardDescription>Detailed breakdown of Actual variance by department and category.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* overflow-x-auto inside DataTable */}
          <DataTable columns={columns} data={mockTableData} />
        </CardContent>
      </Card>
    </div>
  )
}
