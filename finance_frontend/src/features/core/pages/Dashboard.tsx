import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  ArrowDownRight, 
  ArrowUpRight, 
  Wallet,
  Target,
  PieChart as PieChartIcon,
  Truck,
  CheckSquare,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react"
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
  PieChart,
  Pie,
  Cell
} from "recharts"

const monthlyRevenueData = [
  { name: "Jan", revenue: 45000 },
  { name: "Feb", revenue: 52000 },
  { name: "Mar", revenue: 48000 },
  { name: "Apr", revenue: 61000 },
  { name: "May", revenue: 59000 },
  { name: "Jun", revenue: 75000 },
]

const expenseTrendData = [
  { name: "Jan", expense: 32000 },
  { name: "Feb", expense: 34000 },
  { name: "Mar", expense: 31000 },
  { name: "Apr", expense: 39000 },
  { name: "May", expense: 38000 },
  { name: "Jun", expense: 42000 },
]

const budgetVsActualData = [
  { name: "Operations", budget: 120000, actual: 115000 },
  { name: "Maintenance", budget: 80000, actual: 85000 },
  { name: "Fuel", budget: 150000, actual: 142000 },
  { name: "Admin", budget: 50000, actual: 48000 },
  { name: "Marketing", budget: 30000, actual: 32000 },
]

const customerRevenueData = [
  { name: "Acme Corp", value: 45000 },
  { name: "Globex", value: 35000 },
  { name: "Soylent", value: 28000 },
  { name: "Initech", value: 25000 },
  { name: "Umbrella", value: 15000 },
]

const regionRevenueData = [
  { name: "North", value: 85000 },
  { name: "South", value: 65000 },
  { name: "East", value: 55000 },
  { name: "West", value: 75000 },
]

const expenseCategoryData = [
  { name: "Fuel", value: 45 },
  { name: "Maintenance", value: 25 },
  { name: "Salaries", value: 20 },
  { name: "Insurance", value: 10 },
]

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']

const latestTransactions = [
  { id: "TX001", date: "2024-03-15", desc: "Fuel Payment - Shell", amount: -4500, status: "Completed" },
  { id: "TX002", date: "2024-03-14", desc: "Invoice Payment - Acme Corp", amount: 15000, status: "Completed" },
  { id: "TX003", date: "2024-03-14", desc: "Vehicle Maintenance", amount: -2800, status: "Pending" },
  { id: "TX004", date: "2024-03-13", desc: "Toll Charges Batch", amount: -850, status: "Completed" },
  { id: "TX005", date: "2024-03-13", desc: "Invoice Payment - Globex", amount: 8500, status: "Completed" },
]

const pendingApprovals = [
  { id: "APV-089", type: "Vendor Bill", entity: "Michelin Tires", amount: 12500, date: "2024-03-14", urgency: "High" },
  { id: "APV-090", type: "Expense Report", entity: "John Doe", amount: 450, date: "2024-03-14", urgency: "Normal" },
  { id: "APV-091", type: "Credit Note", entity: "Initech Corp", amount: 1200, date: "2024-03-13", urgency: "Normal" },
  { id: "APV-092", type: "Vendor Bill", entity: "AWS Cloud", amount: 3500, date: "2024-03-12", urgency: "Low" },
]

const recentActivities = [
  { id: 1, time: "10:30 AM", desc: "Invoice #INV-2024-001 paid by Acme Corp", icon: CheckCircle2, color: "text-emerald-500" },
  { id: 2, time: "09:15 AM", desc: "New vendor bill submitted by Transport Services Ltd", icon: FileText, color: "text-blue-500" },
  { id: 3, time: "Yesterday", desc: "Budget utilization alert: Fuel category exceeded 90%", icon: AlertCircle, color: "text-amber-500" },
  { id: 4, time: "Yesterday", desc: "Month-end reconciliation completed by Admin", icon: CheckSquare, color: "text-emerald-500" },
  { id: 5, time: "Mar 13", desc: "Payment run scheduled for 15 pending bills", icon: Clock, color: "text-blue-500" },
]

export default function Dashboard() {
  return (
    <div className="flex-1 space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Comprehensive overview of TMS financial performance.
          </p>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Row 1 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,245,231.89</div>
            <p className="text-xs text-emerald-500 flex items-center mt-1">
              <TrendingUp className="mr-1 h-3 w-3" /> +12.5% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Expense</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$892,234.00</div>
            <p className="text-xs text-destructive flex items-center mt-1">
              <TrendingUp className="mr-1 h-3 w-3" /> +4.2% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$352,997.89</div>
            <p className="text-xs text-emerald-500 flex items-center mt-1">
              <TrendingUp className="mr-1 h-3 w-3" /> +8.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Collection</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$14,250.00</div>
            <p className="text-xs text-muted-foreground mt-1">
              across 8 transactions
            </p>
          </CardContent>
        </Card>

        {/* Row 2 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Receivables</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$126,450.50</div>
            <p className="text-xs text-destructive flex items-center mt-1">
              $45k overdue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Payables</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$41,100.50</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              Due within 30 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Customer Outstanding</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground mt-1">
              Customers with pending dues
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vendor Bills Pending</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-amber-500 mt-1">
              5 requires immediate action
            </p>
          </CardContent>
        </Card>

        {/* Row 3 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Budget</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$430,000</div>
            <p className="text-xs text-muted-foreground mt-1">
              Allocated for current month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78.5%</div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: '78.5%' }}></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vehicles Running</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">145 / 160</div>
            <p className="text-xs text-emerald-500 mt-1">
              90.6% fleet utilization
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-amber-500 mt-1">
              Awaiting your review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* 1. Monthly Revenue */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>Revenue trajectory over the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenueData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 2. Expense Category Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Distribution</CardTitle>
            <CardDescription>Breakdown by major categories.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} formatter={(val) => `${val}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section 2 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* 3. Budget vs Actual */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Budget vs Actual</CardTitle>
            <CardDescription>Departmental comparison of allocated budget vs actual spending.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetVsActualData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="budget" name="Budget" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="actual" name="Actual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 4. Expense Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Trend</CardTitle>
            <CardDescription>Monthly expense trajectory.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={expenseTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section 3 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 5. Customer-wise Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Top Customers by Revenue</CardTitle>
            <CardDescription>Highest contributing clients.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customerRevenueData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 6. Region-wise Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Region-wise Revenue</CardTitle>
            <CardDescription>Revenue distribution across operational regions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={regionRevenueData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {regionRevenueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables & Lists Section */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
        {/* Latest Transactions Table */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Latest Transactions</CardTitle>
            <CardDescription>Recent financial activities across the organization.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Txn ID</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {latestTransactions.map((tx, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{tx.id}</td>
                      <td className="px-4 py-3 text-muted-foreground">{tx.date}</td>
                      <td className="px-4 py-3">{tx.desc}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                        {tx.amount > 0 ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals Table/List */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Items requiring your authorization.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingApprovals.map((apv, i) => (
                <div key={i} className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{apv.entity}</p>
                    <p className="text-xs text-muted-foreground">{apv.type} • {apv.date}</p>
                    {apv.urgency === 'High' && (
                      <span className="inline-flex text-[10px] bg-destructive/15 text-destructive px-1.5 py-0.5 rounded uppercase font-semibold mt-1">High Urgency</span>
                    )}
                  </div>
                  <div className="font-medium text-sm">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(apv.amount)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Activities Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
          <CardDescription>Audit trail of system events.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 pl-4 border-l-2 ml-4">
            {recentActivities.map((act, i) => (
              <div key={i} className="relative">
                <div className={`absolute -left-[25px] bg-background border-2 rounded-full p-1 ${act.color}`}>
                  <act.icon className="h-4 w-4" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between ml-6">
                  <p className="text-sm font-medium">{act.desc}</p>
                  <span className="text-xs text-muted-foreground mt-1 sm:mt-0">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
