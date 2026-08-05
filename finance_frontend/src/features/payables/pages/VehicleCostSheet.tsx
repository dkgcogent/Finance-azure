import React, { useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable, SortableHeader } from "@/components/shared/DataTable"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Car,
  TrendingUp,
  Download,
  Plus,
  X,
  Calculator,
  PieChart,
  AlertTriangle
} from "lucide-react"

type VehicleRecord = {
  id: string
  regNo: string
  model: string
  type: "Owned" | "Leased"
  acquisitionCost: number // Capitalized or Monthly Lease base
  ytdRevenue: number
  ytdExpenses: number
  netProfit: number
  margin: number // Percentage
}

const mockVehicles: VehicleRecord[] = [
  { id: "1", regNo: "MH-01-AB-1234", model: "Tata Ace Gold", type: "Owned", acquisitionCost: 550000, ytdRevenue: 850000, ytdExpenses: 420000, netProfit: 430000, margin: 50.5 },
  { id: "2", regNo: "MH-02-CD-5678", model: "Mahindra Bolero Pickup", type: "Leased", acquisitionCost: 25000, ytdRevenue: 620000, ytdExpenses: 310000, netProfit: 310000, margin: 50.0 },
  { id: "3", regNo: "KA-05-XY-9999", model: "Ashok Leyland Dost", type: "Owned", acquisitionCost: 720000, ytdRevenue: 1250000, ytdExpenses: 800000, netProfit: 450000, margin: 36.0 },
  { id: "4", regNo: "DL-01-ZZ-0001", model: "Tata Intra V30", type: "Leased", acquisitionCost: 28000, ytdRevenue: 450000, ytdExpenses: 500000, netProfit: -50000, margin: -11.1 }, // Loss making
]

export default function VehicleCostSheet() {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRecord | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [costingType, setCostingType] = useState<"Purchasing" | "Leasing">("Purchasing")

  const columns = useMemo<ColumnDef<VehicleRecord>[]>(
    () => [
      {
        accessorKey: "regNo",
        header: ({ column }) => <SortableHeader column={column} title="Registration No." />,
        cell: ({ row }) => (
          <div
            className="flex items-center gap-2 font-bold text-primary cursor-pointer hover:underline"
            onClick={() => setSelectedVehicle(row.original)}
          >
            <Car className="h-4 w-4" />
            {row.getValue("regNo")}
          </div>
        ),
      },
      {
        accessorKey: "model",
        header: ({ column }) => <SortableHeader column={column} title="Vehicle Model" />,
      },
      {
        accessorKey: "type",
        header: "Ownership",
        cell: ({ row }) => {
          const type = row.getValue("type") as string
          return (
            <Badge variant={type === "Owned" ? "default" : "secondary"}>
              {type}
            </Badge>
          )
        },
      },
      {
        accessorKey: "ytdRevenue",
        header: ({ column }) => <SortableHeader column={column} title="YTD Revenue" />,
        cell: ({ row }) => <div className="text-right font-medium">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(row.getValue("ytdRevenue"))}</div>
      },
      {
        accessorKey: "ytdExpenses",
        header: ({ column }) => <SortableHeader column={column} title="YTD Expenses" />,
        cell: ({ row }) => <div className="text-right text-destructive">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(row.getValue("ytdExpenses"))}</div>
      },
      {
        accessorKey: "netProfit",
        header: ({ column }) => <SortableHeader column={column} title="Net Profit" />,
        cell: ({ row }) => {
          const profit = parseFloat(row.getValue("netProfit"))
          return <div className={`text-right font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(profit)}</div>
        }
      },
      {
        accessorKey: "margin",
        header: ({ column }) => <SortableHeader column={column} title="Profit Margin" />,
        cell: ({ row }) => {
          const margin = parseFloat(row.getValue("margin"))
          return (
            <div className="flex items-center justify-end gap-2">
              <span className={`font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{margin}%</span>
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${margin >= 0 ? 'bg-emerald-500' : 'bg-destructive'}`}
                  style={{ width: `${Math.min(Math.abs(margin), 100)}%` }}
                />
              </div>
            </div>
          )
        }
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => setSelectedVehicle(row.original)}>
            View P&L
          </Button>
        ),
      },
    ],
    []
  )

  return (
    <div className="flex-1 space-y-6 pb-8 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Fleet Profitability & Costing</h2>
          <p className="text-muted-foreground mt-1">
            Track vehicle-wise P&L and calculate standard purchasing/leasing costs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Fleet P&L
          </Button>
          <Button size="sm" onClick={() => setIsAddingNew(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Vehicle Cost Sheet
          </Button>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
              <TrendingUp className="h-4 w-4" /> Total Fleet Profit (YTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹11,40,000</div>
            <p className="text-xs opacity-75 mt-1">Across 4 active vehicles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Fleet Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">31.3%</div>
            <p className="text-xs text-muted-foreground mt-1">Target: 25.0%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Owned Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground mt-1">Capital Deployed: ₹12.7L</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Leased Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground mt-1">Monthly Commitment: ₹53k</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle-Wise Profitability Ledger</CardTitle>
          <CardDescription>Detailed revenue vs expense tracking for every vehicle in the fleet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="[&_table]:w-full overflow-x-auto">
            <DataTable columns={columns} data={mockVehicles} />
          </div>
        </CardContent>
      </Card>

      {/* New Vehicle Cost Sheet Calculator (Drawer) */}
      {isAddingNew && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setIsAddingNew(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[600px] md:w-[700px] bg-background border-l shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right-full duration-300">
            <div className="flex items-center justify-between p-4 border-b bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calculator className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Standard Vehicle Cost Sheet</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsAddingNew(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 space-y-8">

              <div className="flex bg-muted/50 p-1 rounded-lg">
                <button
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${costingType === 'Purchasing' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setCostingType('Purchasing')}
                >
                  Purchasing Model
                </button>
                <button
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${costingType === 'Leasing' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setCostingType('Leasing')}
                >
                  Leasing Model
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold border-b pb-2">Vehicle Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Vehicle Model / Make</label>
                    <Input placeholder="e.g. Tata Ace Gold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Registration Number</label>
                    <Input placeholder="e.g. MH-01-AB-1234" />
                  </div>
                </div>
              </div>

              {costingType === 'Purchasing' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="space-y-4">
                    <h4 className="font-bold border-b pb-2">Capital Acquisition Costs</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Ex-Showroom Price (₹)</label>
                        <Input type="number" defaultValue="500000" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">RTO & Registration (₹)</label>
                        <Input type="number" defaultValue="45000" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">First Year Insurance (₹)</label>
                        <Input type="number" defaultValue="25000" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Accessories/Modifications (₹)</label>
                        <Input type="number" defaultValue="15000" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold border-b pb-2">Financing & Amortization (Monthly)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Down Payment (₹)</label>
                        <Input type="number" defaultValue="150000" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Loan EMI (₹)</label>
                        <Input type="number" defaultValue="12500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Depreciation Rate (%)</label>
                        <Input type="number" defaultValue="15" />
                      </div>
                      <div className="space-y-2 pt-8">
                        <div className="bg-primary/10 border border-primary/20 text-primary p-3 rounded-lg flex justify-between items-center">
                          <span className="font-bold text-sm">Monthly Capital Cost:</span>
                          <span className="font-black">₹19,812 / mo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="space-y-4">
                    <h4 className="font-bold border-b pb-2">Lease Structure</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Monthly Lease Rental (₹)</label>
                        <Input type="number" defaultValue="25000" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Security Deposit (₹)</label>
                        <Input type="number" defaultValue="75000" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Lease Tenure (Months)</label>
                        <Input type="number" defaultValue="36" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Maintenance Cap (₹/mo)</label>
                        <Input type="number" defaultValue="5000" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/10 border border-primary/20 text-primary p-4 rounded-lg flex justify-between items-center">
                    <span className="font-bold text-sm">Effective Monthly Lease Cost:</span>
                    <span className="font-black text-xl">₹25,000 / mo</span>
                  </div>
                </div>
              )}

              <Button className="w-full h-12 text-lg mt-8">Save Vehicle Cost Sheet</Button>
            </div>
          </div>
        </>
      )}

      {/* Vehicle P&L Details (Drawer) */}
      {selectedVehicle && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setSelectedVehicle(null)}
          />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[600px] md:w-[700px] bg-background border-l shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right-full duration-300">
            <div className="flex items-center justify-between p-4 border-b bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-black">{selectedVehicle.regNo}</h3>
                <Badge variant={selectedVehicle.type === 'Owned' ? 'default' : 'secondary'}>{selectedVehicle.type}</Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedVehicle(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 space-y-8">

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Vehicle Model</p>
                  <p className="font-bold text-lg">{selectedVehicle.model}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-sm">Acquisition Cost Base</p>
                  <p className="font-bold text-lg">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(selectedVehicle.acquisitionCost)}</p>
                </div>
              </div>

              {/* Vehicle P&L Summary */}
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-muted/50 p-4 border-b flex items-center gap-2 font-bold">
                  <PieChart className="h-5 w-5 text-primary" /> Vehicle P&L Summary (YTD)
                </div>
                <div className="p-6 space-y-6 bg-card">

                  <div className="flex justify-between items-center text-lg">
                    <span className="font-semibold">Total Revenue (Billed)</span>
                    <span className="font-mono text-emerald-600">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(selectedVehicle.ytdRevenue)}</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>(-) Capital / Lease Amortization</span>
                      <span className="font-mono">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(selectedVehicle.ytdExpenses * 0.4)}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>(-) Fuel & Tolls</span>
                      <span className="font-mono">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(selectedVehicle.ytdExpenses * 0.35)}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>(-) Maintenance & Repairs</span>
                      <span className="font-mono">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(selectedVehicle.ytdExpenses * 0.15)}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>(-) Driver Allocations</span>
                      <span className="font-mono">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(selectedVehicle.ytdExpenses * 0.1)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-lg border-t pt-4">
                    <span className="font-semibold text-destructive">Total Expenses</span>
                    <span className="font-mono text-destructive">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(selectedVehicle.ytdExpenses)}</span>
                  </div>

                  <div className={`flex justify-between items-center text-xl font-black border-t pt-4 ${selectedVehicle.netProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    <span>Net Profit / (Loss)</span>
                    <span className="font-mono">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(selectedVehicle.netProfit)}</span>
                  </div>

                </div>
              </div>

              {selectedVehicle.netProfit < 0 && (
                <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Loss Making Asset</h4>
                    <p className="text-sm opacity-90 mt-1">This vehicle is currently operating at a net loss. Review maintenance caps or renegotiate leasing terms.</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </>
      )}
    </div>
  )
}
