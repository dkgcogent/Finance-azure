import { useParams, Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, Edit, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
  Cell
} from "recharts"

const monthlyActualData = [
  { name: "Jan", allocated: 50000 },
  { name: "Feb", allocated: 50000 },
  { name: "Mar", allocated: 55000 },
  { name: "Apr", allocated: 50000 },
  { name: "May", allocated: 60000 },
  { name: "Jun", allocated: 50000 },
]

const actualSpendingData = [
  { name: "Jan", spending: 48000 },
  { name: "Feb", spending: 51000 },
  { name: "Mar", spending: 52000 },
  { name: "Apr", spending: 49000 },
  { name: "May", spending: 65000 }, // Overspend
  { name: "Jun", spending: 45000 },
]

const varianceData = [
  { name: "Jan", variance: 2000 },
  { name: "Feb", variance: -1000 },
  { name: "Mar", variance: 3000 },
  { name: "Apr", variance: 1000 },
  { name: "May", variance: -5000 },
  { name: "Jun", variance: 5000 },
]

export default function ActualDetails() {
  const { id } = useParams()

  // In a real app, fetch data based on ID. We use mock data here.
  const Actual = {
    ActualId: "BGT-2024-001",
    customer: "Acme Corp",
    project: "Logistics Optimization",
    region: "North America",
    site: "Site Alpha",
    location: "New York",
    executive: "John Doe",
    financialYear: "2024-2025",
    totalActual: 500000,
    actualAmount: 450000,
    variance: 50000,
    status: "Approved",
    lastUpdated: "2024-03-15"
  }

  return (
    <div className="flex-1 space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/Actual">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              {Actual.ActualId}
              <Badge variant="success" className="text-sm px-2 py-0.5">{Actual.status}</Badge>
            </h2>
            <p className="text-muted-foreground mt-1">
              {Actual.customer} • {Actual.project}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit Actual
          </Button>
        </div>
      </div>

      {/* Meta Information */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Financial Year</p>
              <p className="font-medium">{Actual.financialYear}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Region</p>
              <p className="font-medium">{Actual.region}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Site & Location</p>
              <p className="font-medium">{Actual.site}, {Actual.location}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Executive in Charge</p>
              <p className="font-medium">{Actual.executive}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Last Updated</p>
              <p className="font-medium">{Actual.lastUpdated}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actual Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Allocated Actual</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Actual.totalActual)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              For financial year {Actual.financialYear}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actual Spending</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Actual.actualAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Current YTD expenditure
            </p>
          </CardContent>
        </Card>
        <Card className={Actual.variance < 0 ? "border-destructive/50 bg-destructive/5" : "border-emerald-500/50 bg-emerald-500/5"}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Remaining Variance</CardTitle>
            {Actual.variance < 0 ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${Actual.variance < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {Actual.variance < 0 ? '-' : '+'}{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(Actual.variance))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Available Actual remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {/* Monthly Actual Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Actual Allocation</CardTitle>
            <CardDescription>Planned Actual distribution across months.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyActualData}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                  <Area type="step" dataKey="allocated" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Actual Spending Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Actual Spending Trend</CardTitle>
            <CardDescription>Realized expenditure tracking.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={actualSpendingData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="spending" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Variance Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Variance Analysis</CardTitle>
            <CardDescription>Positive values indicate under-Actual (savings), negative indicate overspend.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={varianceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} cursor={{ fill: 'hsl(var(--muted)/0.5)' }} />
                  <Bar dataKey="variance" radius={[4, 4, 0, 0]}>
                    {
                      varianceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.variance >= 0 ? '#10b981' : '#ef4444'} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
