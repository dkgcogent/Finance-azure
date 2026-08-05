import React, { useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable, SortableHeader } from "@/components/shared/DataTable"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  PieChart
} from "lucide-react"

type ReportType = "Revenue" | "Expense" | "Budget" | "Invoice" | "Vendor" | "Payment" | "Customer" | "Project" | "Region"

type GenericReportData = {
  id: string
  ref: string
  date: string
  category: string
  amount: number
  status: string
}

const mockReportData: GenericReportData[] = [
  { id: "1", ref: "TRX-1001", date: "2024-03-01", category: "Software", amount: 4500.00, status: "Completed" },
  { id: "2", ref: "TRX-1002", date: "2024-03-02", category: "Hardware", amount: 12000.00, status: "Pending" },
  { id: "3", ref: "TRX-1003", date: "2024-03-05", category: "Consulting", amount: 8500.00, status: "Completed" },
  { id: "4", ref: "TRX-1004", date: "2024-03-08", category: "Licensing", amount: 1250.00, status: "Failed" },
  { id: "5", ref: "TRX-1005", date: "2024-03-10", category: "Software", amount: 3200.00, status: "Completed" },
  { id: "6", ref: "TRX-1006", date: "2024-03-12", category: "Travel", amount: 890.00, status: "Completed" },
  { id: "7", ref: "TRX-1007", date: "2024-03-15", category: "Marketing", amount: 15000.00, status: "Pending" },
]

export default function Reports() {
  const [activeReport, setActiveReport] = useState<ReportType>("Revenue")

  const reportTypes: ReportType[] = [
    "Revenue", "Expense", "Budget", "Invoice", "Vendor", "Payment", "Customer", "Project", "Region"
  ]

  const columns = useMemo<ColumnDef<GenericReportData>[]>(
    () => [
      {
        accessorKey: "ref",
        header: ({ column }) => <SortableHeader column={column} title="Reference ID" />,
        cell: ({ row }) => <div className="font-mono text-sm">{row.getValue("ref")}</div>,
      },
      {
        accessorKey: "date",
        header: ({ column }) => <SortableHeader column={column} title="Date" />,
      },
      {
        accessorKey: "category",
        header: ({ column }) => <SortableHeader column={column} title="Category/Type" />,
      },
      {
        accessorKey: "amount",
        header: ({ column }) => <SortableHeader column={column} title="Amount" />,
        cell: ({ row }) => {
          const amount = parseFloat(row.getValue("amount"))
          return <div className="text-right font-medium">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)}</div>
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
                status === "Completed" ? "success" :
                  status === "Failed" ? "destructive" :
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
          <h2 className="text-3xl font-bold tracking-tight">Reporting Suite</h2>
          <p className="text-muted-foreground mt-1">Generate, view, and export professional tabular reports.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900">
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100 hover:text-green-700 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Tabs */}
        <Card className="w-full md:w-64 shrink-0 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" /> Report Types
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="flex flex-col gap-1">
              {reportTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveReport(type)}
                  className={`px-3 py-2 rounded-md text-sm font-medium text-left transition-colors ${activeReport === type
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  {type} Report
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Report Content */}
        <Card className="flex-1">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
            <div>
              <CardTitle className="text-xl">{activeReport} Report</CardTitle>
              <CardDescription>Showing all {activeReport.toLowerCase()} records for the current period.</CardDescription>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 h-9" placeholder={`Search ${activeReport.toLowerCase()}...`} />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* The DataTable component itself handles padding nicely, but we removed padding from CardContent for a flush edge look */}
            <div className="p-4">
              <DataTable columns={columns} data={mockReportData} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
