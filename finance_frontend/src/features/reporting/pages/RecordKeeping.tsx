import React, { useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable, SortableHeader } from "@/components/shared/DataTable"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Download,
  Search,
  FileText,
  File,
  X,
  Eye,
  Archive,
  UploadCloud,
  FileArchive
} from "lucide-react"

type VaultDocument = {
  id: string
  docId: string
  type: "Customer Invoice" | "Vendor Bill" | "Credit Note" | "Debit Note" | "Payment Advice"
  entity: string
  date: string
  uploadedBy: string
  size: string
}

const mockData: VaultDocument[] = [
  { id: "1", docId: "INV-2024-001", type: "Customer Invoice", entity: "Acme Corp", date: "2024-03-01", uploadedBy: "System (Auto)", size: "124 KB" },
  { id: "2", docId: "BILL-2024-001", type: "Vendor Bill", entity: "TechCorp Services", date: "2024-03-05", uploadedBy: "Jane Smith", size: "2.1 MB" },
  { id: "3", docId: "CN-2024-001", type: "Credit Note", entity: "Globex Inc", date: "2024-03-10", uploadedBy: "John Doe", size: "89 KB" },
  { id: "4", docId: "PA-2024-03-A", type: "Payment Advice", entity: "Multiple Vendors", date: "2024-03-15", uploadedBy: "Finance Dept", size: "450 KB" },
  { id: "5", docId: "DN-2024-001", type: "Debit Note", entity: "Office Supplies Co", date: "2024-03-20", uploadedBy: "System (Auto)", size: "92 KB" },
  { id: "6", docId: "INV-2023-998", type: "Customer Invoice", entity: "Initech", date: "2023-12-15", uploadedBy: "System (Auto)", size: "110 KB" },
]

export default function RecordKeeping() {
  const [selectedDoc, setSelectedDoc] = useState<VaultDocument | null>(null)
  const [filterType, setFilterType] = useState<string>("All")

  const filteredData = useMemo(() => {
    if (filterType === "All") return mockData
    return mockData.filter(d => d.type === filterType)
  }, [filterType])

  const columns = useMemo<ColumnDef<VaultDocument>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            className="rounded border-gray-300"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="rounded border-gray-300"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "docId",
        header: ({ column }) => <SortableHeader column={column} title="Document ID" />,
        cell: ({ row }) => (
          <div
            className="flex items-center gap-2 font-medium text-primary cursor-pointer hover:underline"
            onClick={() => setSelectedDoc(row.original)}
          >
            <FileText className="h-4 w-4" />
            {row.getValue("docId")}
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: ({ column }) => <SortableHeader column={column} title="Document Type" />,
        cell: ({ row }) => {
          const type = row.getValue("type") as string
          return (
            <Badge variant="outline" className="bg-muted/50">
              {type}
            </Badge>
          )
        },
      },
      {
        accessorKey: "entity",
        header: ({ column }) => <SortableHeader column={column} title="Related Entity" />,
      },
      {
        accessorKey: "date",
        header: ({ column }) => <SortableHeader column={column} title="Date Generated/Uploaded" />,
      },
      {
        accessorKey: "uploadedBy",
        header: "Source",
        cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.getValue("uploadedBy")}</span>
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(row.original)}>
              <Eye className="h-4 w-4 mr-2" /> View
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
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
          <h2 className="text-3xl font-bold tracking-tight">Record Keeping Vault</h2>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Archive className="h-4 w-4" /> Infinite retention vault for all financial documents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <UploadCloud className="mr-2 h-4 w-4" />
            Upload Legacy Document
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <FileArchive className="mr-2 h-4 w-4" />
            Download Selected as ZIP
          </Button>
        </div>
      </div>

      <Card className="bg-card">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end justify-between">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="space-y-1 w-full md:w-64">
              <label className="text-xs font-medium text-muted-foreground">Search Vault</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 h-9" placeholder="Doc ID, Entity, Date..." />
              </div>
            </div>
            <div className="space-y-1 w-full md:w-48">
              <label className="text-xs font-medium text-muted-foreground">Document Type</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="All">All Documents</option>
                <option value="Customer Invoice">Customer Invoices</option>
                <option value="Vendor Bill">Vendor Bills</option>
                <option value="Credit Note">Credit Notes (CN)</option>
                <option value="Debit Note">Debit Notes (DN)</option>
                <option value="Payment Advice">Payment Advice</option>
              </select>
            </div>
            <div className="space-y-1 w-full md:w-48">
              <label className="text-xs font-medium text-muted-foreground">Financial Year</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option>FY 2023-24</option>
                <option>FY 2022-23</option>
                <option>All Time</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4 px-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Stored</p>
              <p className="text-xl font-bold">{filteredData.length} Files</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="[&_table]:w-full overflow-x-auto">
          <DataTable columns={columns} data={filteredData} />
        </div>
      </Card>

      {/* Document Preview Drawer */}
      {selectedDoc && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setSelectedDoc(null)}
          />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[700px] md:w-[900px] bg-background border-l shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right-full duration-300">
            <div className="flex items-center justify-between p-4 border-b bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold">{selectedDoc.docId}</h3>
                <Badge variant="outline">{selectedDoc.type}</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSelectedDoc(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 h-[calc(100vh-73px)] flex flex-col">
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-xs text-muted-foreground">Entity</p>
                  <p className="font-medium">{selectedDoc.entity}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">{selectedDoc.date}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="font-medium">{selectedDoc.uploadedBy}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">File Size</p>
                  <p className="font-medium">{selectedDoc.size}</p>
                </div>
              </div>

              {/* Mock PDF Viewer */}
              <div className="flex-1 bg-zinc-100 dark:bg-zinc-900 border rounded-lg flex items-center justify-center p-8 overflow-y-auto">
                <div className="bg-white dark:bg-zinc-950 w-full max-w-2xl min-h-[800px] shadow-sm p-12 text-zinc-900 dark:text-zinc-100 relative">
                  {/* Watermark to show it's an archived copy */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                    <span className="text-8xl font-black rotate-[-45deg] uppercase">Archived</span>
                  </div>

                  <div className="flex justify-between border-b pb-6 mb-6">
                    <div>
                      <h1 className="text-2xl font-black mb-1">TMS Finance</h1>
                      <p className="text-sm opacity-60">123 Corporate Blvd, Business Park</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-xl font-bold uppercase text-primary">{selectedDoc.type}</h2>
                      <p className="text-sm font-medium mt-1">Ref: {selectedDoc.docId}</p>
                      <p className="text-sm opacity-60">Date: {selectedDoc.date}</p>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Entity Information</h3>
                    <p className="font-bold text-lg">{selectedDoc.entity}</p>
                    <p className="text-sm opacity-80 mt-1">This is an archived visual representation of the document stored in the vault.</p>
                  </div>

                  <div className="w-full h-64 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded flex items-center justify-center text-zinc-400">
                    <div className="text-center">
                      <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Detailed document contents render here</p>
                    </div>
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
