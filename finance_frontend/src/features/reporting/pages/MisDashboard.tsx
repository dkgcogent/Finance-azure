import React, { useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable, SortableHeader } from "@/components/shared/DataTable"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from "recharts"
import {
  Download,
  Filter,
  TrendingUp,
  Activity,
  Target,
  AlertCircle
} from "lucide-react"

const actualVsBudgetData = [
  { name: 'Q1', actual: 120000, budget: 110000 },
  { name: 'Q2', actual: 145000, budget: 150000 },
  { name: 'Q3', actual: 180000, budget: 160000 },
  { name: 'Q4', actual: 195000, budget: 200000 },
]

type ApprovalMetric = {
  department: string
  totalRequests: number
  avgTurnaround: string
  bottleneckRate: string
  status: "Optimized" | "Warning" | "Critical"
}

const mockAnalytics: ApprovalMetric[] = [
  { department: "Sales", totalRequests: 450, avgTurnaround: "1.2 Days", bottleneckRate: "4%", status: "Optimized" },
  { department: "Operations", totalRequests: 320, avgTurnaround: "3.5 Days", bottleneckRate: "15%", status: "Warning" },
  { department: "Marketing", totalRequests: 180, avgTurnaround: "1.0 Days", bottleneckRate: "2%", status: "Optimized" },
  { department: "IT / Tech", totalRequests: 210, avgTurnaround: "5.2 Days", bottleneckRate: "28%", status: "Critical" },
  { department: "HR", totalRequests: 95, avgTurnaround: "2.1 Days", bottleneckRate: "8%", status: "Optimized" },
]

export default function MisDashboard() {
  const columns = useMemo<ColumnDef<ApprovalMetric>[]>(
    () => [
      {
        accessorKey: "department",
        header: ({ column }) => <SortableHeader column={column} title="Department" />,
        cell: ({ row }) => <div className="font-semibold">{row.getValue("department")}</div>,
      },
      {
        accessorKey: "totalRequests",
        header: ({ column }) => <SortableHeader column={column} title="Total Requests" />,
        cell: ({ row }) => <div className="text-right">{row.getValue("totalRequests")}</div>,
      },
      {
        accessorKey: "avgTurnaround",
        header: ({ column }) => <SortableHeader column={column} title="Avg. Turnaround Time" />,
        cell: ({ row }) => <div className="text-right font-medium">{row.getValue("avgTurnaround")}</div>,
      },
      {
        accessorKey: "bottleneckRate",
        header: ({ column }) => <SortableHeader column={column} title="Bottleneck Rate" />,
        cell: ({ row }) => <div className="text-right">{row.getValue("bottleneckRate")}</div>,
      },
      {
        accessorKey: "status",
        header: "Efficiency Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string
          return (
            <Badge
              variant={
                status === "Optimized" ? "success" :
                  status === "Critical" ? "destructive" :
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
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">MIS Dashboard</h2>
          <p className="text-muted-foreground mt-1">Management Information System & Executive Analytics.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Global Filters
          </Button>
          <Button size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export PDF Report
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-lg border">
        <select className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <option>All Regions</option>
          <option>North America</option>
          <option>EMEA</option>
          <option>APAC</option>
        </select>
        <select className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <option>All Projects</option>
          <option>Project Alpha</option>
          <option>Project Beta</option>
        </select>
        <Input className="h-9 w-48" type="month" defaultValue="2024-03" />
      </div>

      {/* Executive KPI Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90"><Target className="h-4 w-4" /> YTD Actuals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$640,000</div>
            <p className="text-xs opacity-75 mt-1">103% of Target</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">YTD Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$620,000</div>
            <p className="text-xs text-muted-foreground mt-1">Annual allocation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">+$20,000</div>
            <p className="text-xs text-emerald-600/70 mt-1 flex items-center"><TrendingUp className="h-3 w-3 mr-1" /> Favorable</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Avg Bottleneck</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">11.4%</div>
            <p className="text-xs text-muted-foreground mt-1">Across all departments</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Chart & Table */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actuals vs Budget (Quarterly)</CardTitle>
            <CardDescription>Performance against budgeted allocations.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={actualVsBudgetData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Legend />
                  <Bar dataKey="actual" name="Actual Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="budget" name="Budgeted Revenue" fill="#94a3b8" opacity={0.5} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Approval Efficiency</CardTitle>
            <CardDescription>Departmental performance metrics for internal requests.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <DataTable columns={columns} data={mockAnalytics} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
