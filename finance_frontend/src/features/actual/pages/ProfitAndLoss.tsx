import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  Upload,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet
} from "lucide-react"

// Mock data types
type PnLItem = {
  id: string
  name: string
  amount: number
  children?: PnLItem[]
}

type PnLData = {
  revenue: PnLItem[]
  cogs: PnLItem[]
  expenses: PnLItem[]
}

const initialData: PnLData = {
  revenue: [
    {
      id: "rev-1", name: "Operating Revenue", amount: 150000, children: [
        { id: "rev-1-1", name: "Software Subscriptions", amount: 100000 },
        { id: "rev-1-2", name: "Consulting Services", amount: 50000 }
      ]
    },
    { id: "rev-2", name: "Other Income", amount: 10000 }
  ],
  cogs: [
    { id: "cogs-1", name: "Hosting Costs", amount: 20000 },
    { id: "cogs-2", name: "Direct Labor", amount: 40000 }
  ],
  expenses: [
    {
      id: "exp-1", name: "Payroll", amount: 45000, children: [
        { id: "exp-1-1", name: "Salaries", amount: 40000 },
        { id: "exp-1-2", name: "Benefits", amount: 5000 }
      ]
    },
    { id: "exp-2", name: "Marketing", amount: 15000 },
    { id: "exp-3", name: "Office Supplies", amount: 2000 }
  ]
}

const sumItems = (items: PnLItem[]): number => items.reduce((acc, item) => acc + item.amount, 0)

const PnLRow = ({ item, level = 0, isBold = false }: { item: PnLItem, level?: number, isBold?: boolean }) => {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = item.children && item.children.length > 0

  return (
    <React.Fragment>
      <div
        className={`flex justify-between items-center py-2 px-4 border-b hover:bg-muted/50 transition-colors ${isBold ? 'font-semibold' : ''}`}
        style={{ paddingLeft: `${level * 1.5 + 1}rem` }}
      >
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button onClick={() => setExpanded(!expanded)} className="p-0.5 hover:bg-muted rounded">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <div className="w-5" />
          )}
          <span>{item.name}</span>
        </div>
        <div>
          {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(item.amount)}
        </div>
      </div>
      {hasChildren && expanded && item.children!.map(child => (
        <PnLRow key={child.id} item={child} level={level + 1} />
      ))}
    </React.Fragment>
  )
}

export default function ProfitAndLoss() {
  const [isTallyModalOpen, setIsTallyModalOpen] = useState(false)
  const [data, setData] = useState<PnLData>(initialData)

  const totalRevenue = sumItems(data.revenue)
  const totalCogs = sumItems(data.cogs)
  const grossProfit = totalRevenue - totalCogs
  const grossMargin = totalRevenue ? (grossProfit / totalRevenue) * 100 : 0

  const totalExpenses = sumItems(data.expenses)
  const netProfit = grossProfit - totalExpenses
  const netMargin = totalRevenue ? (netProfit / totalRevenue) * 100 : 0

  return (
    <div className="flex-1 space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Profit & Loss</h2>
          <p className="text-muted-foreground mt-1">
            Multidimensional P&L statement with Tally integration.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button size="sm" onClick={() => setIsTallyModalOpen(true)} className="bg-[#f08c3e] hover:bg-[#d97c36] text-white">
            <Upload className="mr-2 h-4 w-4" />
            Import from Tally
          </Button>
        </div>
      </div>

      {/* Advanced Filters Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Dimensional Filters
          </CardTitle>
          <CardDescription>Filter P&L by specific cross-sections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Date Range / Year</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="ytd">Year to Date (YTD)</option>
                <option value="2024">2024-2025</option>
                <option value="2023">2023-2024</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Company</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">All Companies</option>
                <option value="acme">Acme Corp</option>
                <option value="globex">Globex Corporation</option>
                <option value="soylent">Soylent Corp</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Customer</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search customer..." className="h-9 pl-8" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Project</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">All Projects</option>
                <option value="p1">Logistics Optimization</option>
                <option value="p2">Warehouse Expansion</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Region</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">All Regions</option>
                <option value="na">North America</option>
                <option value="eu">Europe</option>
                <option value="ap">Asia Pacific</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Site</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">All Sites</option>
                <option value="s1">Site Alpha</option>
                <option value="s2">Site Beta</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Location</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">All Locations</option>
                <option value="ny">New York</option>
                <option value="ldn">London</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Executive</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">All Executives</option>
                <option value="e1">John Doe</option>
                <option value="e2">Jane Smith</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4 gap-2">
            <Button variant="outline" size="sm">Reset</Button>
            <Button size="sm">Apply Filters</Button>
          </div>
        </CardContent>
      </Card>

      {/* P&L Statement Grid */}
      <Card>
        <CardHeader className="bg-muted/50 border-b">
          <div className="flex justify-between items-center">
            <CardTitle>Profit & Loss Statement</CardTitle>
            <Badge variant="outline" className="font-mono text-sm bg-background">USD ($)</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0 text-sm">
          {/* Revenue */}
          <div className="bg-primary/5 py-2 px-4 border-b font-bold text-primary flex justify-between">
            <span>Income / Revenue</span>
            <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalRevenue)}</span>
          </div>
          {data.revenue.map(item => <PnLRow key={item.id} item={item} />)}

          {/* COGS */}
          <div className="bg-destructive/5 py-2 px-4 border-b font-bold text-destructive flex justify-between mt-4">
            <span>Cost of Goods Sold (COGS)</span>
            <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalCogs)}</span>
          </div>
          {data.cogs.map(item => <PnLRow key={item.id} item={item} />)}

          {/* Gross Profit */}
          <div className="bg-muted py-3 px-4 border-b font-bold text-base flex justify-between mt-2">
            <span>Gross Profit</span>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-sm font-medium">{grossMargin.toFixed(1)}% Margin</span>
              <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(grossProfit)}</span>
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-destructive/5 py-2 px-4 border-b font-bold text-destructive flex justify-between mt-4">
            <span>Operating Expenses</span>
            <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalExpenses)}</span>
          </div>
          {data.expenses.map(item => <PnLRow key={item.id} item={item} />)}

          {/* Net Profit */}
          <div className="bg-primary py-4 px-4 font-bold text-lg text-primary-foreground flex justify-between mt-4 rounded-b-lg">
            <span>Net Profit</span>
            <div className="flex items-center gap-4">
              <span className="text-primary-foreground/80 text-sm font-medium">{netMargin.toFixed(1)}% Margin</span>
              <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(netProfit)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tally Import Modal */}
      <Modal
        isOpen={isTallyModalOpen}
        onClose={() => setIsTallyModalOpen(false)}
        title="Import from Tally"
        description="Upload your Tally ERP 9 / Tally Prime XML export to sync revenue and expenses."
        size="md"
      >
        <form className="space-y-4 pt-4" onSubmit={(e) => { e.preventDefault(); setIsTallyModalOpen(false) }}>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-sm font-medium">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground mt-1">Tally XML export files only (max 10MB)</p>
            <Input type="file" className="hidden" accept=".xml" id="tally-upload" />
            <Button type="button" variant="secondary" className="mt-4" onClick={() => document.getElementById('tally-upload')?.click()}>
              Browse Files
            </Button>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-sm font-medium">Data Mapping Mode</label>
            <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="auto">Auto-map Ledgers to Dimensions</option>
              <option value="manual">Manual Review</option>
            </select>
            <p className="text-xs text-muted-foreground">Auto-mapping will attempt to extract Project, Customer, and Region from Cost Centres in Tally.</p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsTallyModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#f08c3e] hover:bg-[#d97c36] text-white">Start Import</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
