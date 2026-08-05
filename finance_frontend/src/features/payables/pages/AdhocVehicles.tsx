import React, { useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable, SortableHeader } from "@/components/shared/DataTable"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Download,
  Plus,
  Truck,
  X,
  CheckCircle2,
  ArrowLeft,
  Clock,
  CheckCircle,
  Ban,
  MessageSquare,
  ShieldCheck,
  CreditCard,
  Banknote
} from "lucide-react"

type AdhocRequest = {
  id: string
  requestId: string
  vehicleNo: string
  vendorName: string
  route: string
  date: string
  amount: number
  advanceAmount: number
  status: "Draft" | "Pending Approval" | "Approved" | "Advance Paid" | "Settled" | "Rejected"
}

const mockData: AdhocRequest[] = [
  { id: "1", requestId: "AH-2024-001", vehicleNo: "MH-12-AB-1234", vendorName: "Raj Logistics", route: "Mumbai - Pune", date: "2024-03-01", amount: 15000, advanceAmount: 5000, status: "Settled" },
  { id: "2", requestId: "AH-2024-002", vehicleNo: "GJ-01-CD-5678", vendorName: "Shree Transport", route: "Ahmedabad - Surat", date: "2024-03-15", amount: 18000, advanceAmount: 6000, status: "Advance Paid" },
  { id: "3", requestId: "AH-2024-003", vehicleNo: "DL-04-EF-9012", vendorName: "Delhi Freight Co.", route: "Delhi - Jaipur", date: "2024-03-22", amount: 25000, advanceAmount: 10000, status: "Pending Approval" },
  { id: "4", requestId: "AH-2024-004", vehicleNo: "KA-05-GH-3456", vendorName: "South Cargo", route: "Bangalore - Chennai", date: "2024-03-24", amount: 32000, advanceAmount: 15000, status: "Approved" },
  { id: "5", requestId: "AH-2024-005", vehicleNo: "UP-14-IJ-7890", vendorName: "North Movers", route: "Noida - Agra", date: "2024-03-28", amount: 12000, advanceAmount: 4000, status: "Draft" },
]

export default function AdhocVehicles() {
  const [view, setView] = useState<"list" | "create">("list")
  const [selectedRequest, setSelectedRequest] = useState<AdhocRequest | null>(null)

  // Form State
  const [selectedRateCard, setSelectedRateCard] = useState<string>("")
  const [totalAmount, setTotalAmount] = useState<number>(0)
  const [advancePercent, setAdvancePercent] = useState<number>(30)

  const handleRateCardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedRateCard(val)
    if (val === "routeA") setTotalAmount(15000)
    else if (val === "routeB") setTotalAmount(25000)
    else if (val === "routeC") setTotalAmount(35000)
    else setTotalAmount(0)
  }

  const columns = useMemo<ColumnDef<AdhocRequest>[]>(
    () => [
      {
        accessorKey: "requestId",
        header: ({ column }) => <SortableHeader column={column} title="Request ID" />,
        cell: ({ row }) => (
          <div
            className="flex items-center gap-2 font-medium text-primary cursor-pointer hover:underline"
            onClick={() => setSelectedRequest(row.original)}
          >
            <Truck className="h-4 w-4" />
            {row.getValue("requestId")}
          </div>
        ),
      },
      {
        accessorKey: "vendorName",
        header: ({ column }) => <SortableHeader column={column} title="Vendor/Owner Name" />,
      },
      {
        accessorKey: "vehicleNo",
        header: ({ column }) => <SortableHeader column={column} title="Vehicle No" />,
      },
      {
        accessorKey: "route",
        header: ({ column }) => <SortableHeader column={column} title="Route/Location" />,
      },
      {
        accessorKey: "amount",
        header: ({ column }) => <SortableHeader column={column} title="Total Amount" />,
        cell: ({ row }) => {
          const amount = parseFloat(row.getValue("amount"))
          return <div className="text-right font-medium">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)}</div>
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
                status === "Settled" ? "success" :
                  status === "Approved" ? "success" :
                    status === "Advance Paid" ? "default" :
                      status === "Pending Approval" ? "warning" :
                        status === "Rejected" ? "destructive" :
                          "secondary"
              }
            >
              {status}
            </Badge>
          )
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(row.original)}>
              Review
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  const renderTimeline = (status: string) => {
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">Approval & Payment Tracker</h4>
        <div className="relative border-l border-muted-foreground/20 ml-3 space-y-6 pb-4">
          <div className="relative pl-6">
            <div className={`absolute -left-[11px] top-1 p-1 rounded-full bg-background border border-primary text-primary`}>
              <CheckCircle className="h-3 w-3" />
            </div>
            <div>
              <p className={`text-sm font-medium text-foreground`}>Request Raised</p>
              <p className="text-xs text-muted-foreground">Adhoc vehicle requirement logged.</p>
            </div>
          </div>

          <div className="relative pl-6">
            <div className={`absolute -left-[11px] top-1 p-1 rounded-full bg-background border ${status !== 'Draft' && status !== 'Pending Approval' ? 'border-primary text-primary' : 'border-muted text-muted-foreground'}`}>
              <ShieldCheck className="h-3 w-3" />
            </div>
            <div>
              <p className={`text-sm font-medium ${status !== 'Draft' && status !== 'Pending Approval' ? 'text-foreground' : 'text-muted-foreground'}`}>Approved by Ops/Management</p>
              {status === 'Pending Approval' && <p className="text-xs text-amber-500">Awaiting action</p>}
            </div>
          </div>

          <div className="relative pl-6">
            <div className={`absolute -left-[11px] top-1 p-1 rounded-full bg-background border ${status === 'Advance Paid' || status === 'Settled' ? 'border-primary text-primary' : 'border-muted text-muted-foreground'}`}>
              <Banknote className="h-3 w-3" />
            </div>
            <div>
              <p className={`text-sm font-medium ${status === 'Advance Paid' || status === 'Settled' ? 'text-foreground' : 'text-muted-foreground'}`}>Advance Payment Processed</p>
            </div>
          </div>

          <div className="relative pl-6">
            <div className={`absolute -left-[11px] top-1 p-1 rounded-full bg-background border ${status === 'Settled' ? 'border-primary text-primary' : 'border-muted text-muted-foreground'}`}>
              <CreditCard className="h-3 w-3" />
            </div>
            <div>
              <p className={`text-sm font-medium ${status === 'Settled' ? 'text-foreground' : 'text-muted-foreground'}`}>F&F Settled</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 pb-8 relative">
      {/* Header */}
      {view === "list" ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Adhoc Vehicles</h2>
            <p className="text-muted-foreground mt-1">
              Manage adhoc vehicle requests, approvals, and settlements.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => setView("create")}>
              <Plus className="mr-2 h-4 w-4" />
              New Adhoc Request
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setView("list")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Create Adhoc Request</h2>
              <p className="text-muted-foreground mt-1">
                Log a new adhoc vehicle requirement for approval and payment.
              </p>
            </div>
          </div>
        </div>
      )}

      {view === "list" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Pending Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-500">1</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Total Approved (Awaiting Advance)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">1</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending F&F</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">1</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Settled (Month)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Adhoc Vehicle Register</CardTitle>
              <CardDescription>A complete log of all adhoc vehicles utilized.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={mockData} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Adhoc Requirement Details</CardTitle>
            <CardDescription>Fill out the details for the adhoc vehicle requirement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Requirement ID</label>
                <Input value="Auto-generated on save" disabled className="bg-muted font-medium text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Required</label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Vehicle Number (If Known)</label>
                <Input placeholder="e.g. MH-12-AB-1234" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Vendor / Fleet Owner Name</label>
                <Input placeholder="Name of transport vendor" />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Billing & Payment Config</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/20 border rounded-lg">
                <div className="space-y-2 col-span-full md:col-span-1">
                  <label className="text-sm font-medium">Agreed Rate Card (Route / Type)</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={selectedRateCard}
                    onChange={handleRateCardChange}
                  >
                    <option value="">Select agreed rate...</option>
                    <option value="routeA">Mumbai - Pune (10T Truck) - ₹15,000</option>
                    <option value="routeB">Ahmedabad - Surat (20T Truck) - ₹25,000</option>
                    <option value="routeC">Delhi - Jaipur (20T Truck) - ₹35,000</option>
                    <option value="custom">Custom Rate (Exception)</option>
                  </select>
                  <p className="text-xs text-muted-foreground">Select to automatically apply agreed billing rates.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Amount</label>
                  <Input
                    type="number"
                    value={totalAmount || ''}
                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                    disabled={selectedRateCard !== "custom" && selectedRateCard !== ""}
                    placeholder="₹0.00"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Advance % required</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={advancePercent}
                    onChange={(e) => setAdvancePercent(Number(e.target.value))}
                  >
                    <option value={0}>0%</option>
                    <option value={10}>10%</option>
                    <option value={20}>20%</option>
                    <option value={30}>30%</option>
                    <option value={40}>40%</option>
                    <option value={50}>50%</option>
                    <option value={100}>100% (Full Advance)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Calculated Advance Amount</label>
                  <Input value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalAmount * (advancePercent / 100))} disabled className="bg-muted" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Remarks / Justification</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Provide justification for adhoc requirement..."
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t gap-2">
              <Button variant="outline" onClick={() => setView("list")}>Cancel</Button>
              <Button variant="secondary">Save as Draft</Button>
              <Button variant="default">Submit for Approval</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Adhoc Detail Drawer */}
      {selectedRequest && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setSelectedRequest(null)}
          />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[600px] md:w-[700px] bg-background border-l shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right-full duration-300">
            <div className="flex items-center justify-between p-4 border-b bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold">{selectedRequest.requestId}</h3>
                <Badge variant={
                  selectedRequest.status === "Settled" ? "success" :
                    selectedRequest.status === "Approved" ? "success" :
                      selectedRequest.status === "Pending Approval" ? "warning" : "default"
                }>
                  {selectedRequest.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setSelectedRequest(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">

              <div className="md:col-span-2 space-y-6">

                <div className="border rounded-xl p-5 bg-muted/10 space-y-4">
                  <h3 className="font-semibold border-b pb-2">Requirement Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Vendor/Owner</p>
                      <p className="font-medium">{selectedRequest.vendorName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Vehicle No.</p>
                      <p className="font-medium">{selectedRequest.vehicleNo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Route/Location</p>
                      <p className="font-medium">{selectedRequest.route}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium">{selectedRequest.date}</p>
                    </div>
                  </div>
                </div>

                <div className="border rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold border-b pb-2">Billing & Split</h3>

                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground">Total Agreed Amount</span>
                    <span className="font-bold text-lg">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(selectedRequest.amount)}</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 rounded-lg border bg-background">
                      <div>
                        <p className="font-medium flex items-center gap-2"><Banknote className="h-4 w-4 text-primary" /> Advance Payment</p>
                        <p className="text-xs text-muted-foreground">Required before loading</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(selectedRequest.advanceAmount)}</p>
                        {selectedRequest.status === "Advance Paid" || selectedRequest.status === "Settled" ? (
                          <Badge variant="success" className="mt-1 text-[10px]">Paid</Badge>
                        ) : (
                          <Badge variant="outline" className="mt-1 text-[10px]">Unpaid</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-lg border bg-background">
                      <div>
                        <p className="font-medium flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> F&F Settlement</p>
                        <p className="text-xs text-muted-foreground">Remaining balance</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(selectedRequest.amount - selectedRequest.advanceAmount)}</p>
                        {selectedRequest.status === "Settled" ? (
                          <Badge variant="success" className="mt-1 text-[10px]">Paid</Badge>
                        ) : (
                          <Badge variant="outline" className="mt-1 text-[10px]">Unpaid</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Managerial Approval Panel replacing Whatsapp */}
                {selectedRequest.status === "Pending Approval" && (
                  <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded-xl p-5 space-y-4">
                    <h3 className="font-semibold text-amber-800 dark:text-amber-500 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" /> Management Approval Required
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      This request requires operations head approval before advance payment can be processed. (Replaces manual Whatsapp/Phone approvals)
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">Approve Request</Button>
                      <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive">Reject</Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-8">
                {renderTimeline(selectedRequest.status)}

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">Payment Actions</h4>
                  <div className="flex flex-col gap-2">
                    <Button
                      className="w-full justify-start"
                      variant="default"
                      disabled={selectedRequest.status !== 'Approved'}
                    >
                      <Banknote className="mr-2 h-4 w-4" /> Process Advance
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="default"
                      disabled={selectedRequest.status !== 'Advance Paid'}
                    >
                      <CreditCard className="mr-2 h-4 w-4" /> Process F&F Settlement
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
