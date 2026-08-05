import React, { useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable, SortableHeader } from "@/components/shared/DataTable"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Link } from "react-router-dom"
import {
  Plus,
  ArrowLeft,
  ShieldCheck,
  Receipt,
  Clock,
  Download
} from "lucide-react"
import { useVendorInvoices, useVendorCNDNs, useCreateVendorCNDN } from "../../payables/hooks/useVendorInvoices"
import { numberToWords } from "@/lib/utils"

type Note = {
  id: string
  noteNumber: string
  type: "Credit Note" | "Debit Note"
  invoiceRef: string
  customerOrVendor: string
  amount: number
  date: string
  reason: string
  status: "Draft" | "Pending Ops Head" | "Pending CEO" | "Approved"
}

const mockNotes: Note[] = [
  { id: "1", noteNumber: "CN-2024-001", type: "Credit Note", invoiceRef: "BILL-2024-001", customerOrVendor: "TechCorp Services", amount: 1500.00, date: "2024-03-05", reason: "Short billing by us", status: "Approved" },
  { id: "2", noteNumber: "DN-2024-001", type: "Debit Note", invoiceRef: "BILL-2024-002", customerOrVendor: "Office Supplies Co", amount: 850.00, date: "2024-03-12", reason: "Debit by vendor", status: "Pending Ops Head" },
  { id: "3", noteNumber: "CN-2024-002", type: "Credit Note", invoiceRef: "BILL-2024-003", customerOrVendor: "AWS", amount: 5000.00, date: "2024-03-18", reason: "Wrong billing by vendor", status: "Pending CEO" },
]

export default function VendorCNDNManagement() {
  const [view, setView] = useState<"list" | "create" | "approvals" | "preview">("list")
  const { data: vendorInvoices } = useVendorInvoices();
  const { data: dbNotes } = useVendorCNDNs();
  const createVendorCNDN = useCreateVendorCNDN();
  
  const displayNotes: any[] = dbNotes || mockNotes;
  const [formData, setFormData] = useState({
    type: "cn",
    invoiceRef: "",
    reason: "",
    amount: "",
    date: "",
    remarks: "",
    gstType: ""
  })

  const currentNoteNumber = `${formData.type === "cn" ? "CN" : "DN"}-2025-00${displayNotes.length + 1}`;

  const handleAddNote = async () => {
    const invoiceContent = document.getElementById('printable-invoice')?.outerHTML || "";
    const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    const stylesHtml = styleElements.map(el => el.outerHTML).join('\n');
    
    const html = invoiceContent ? `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vendor CN/DN</title>
          ${stylesHtml}
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { background: white !important; margin: 0; padding: 0; }
            @media print {
              @page { size: A4 portrait; margin: 0; }
              body { padding: 10mm; margin: 0; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              table { page-break-inside: auto; }
              tr    { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <div style="width: 100%; max-width: 900px; margin: 0 auto;">
            ${invoiceContent}
          </div>
        </body>
      </html>
    ` : "";

    try {
      await createVendorCNDN.mutateAsync({
        noteNumber: currentNoteNumber,
        type: formData.type === "cn" ? "Credit Note" : "Debit Note",
        vendorInvoiceRef: formData.invoiceRef || "UNKNOWN-BILL",
        amount: parseFloat(formData.amount) || 0,
        date: formData.date || new Date().toISOString().split('T')[0],
        reason: formData.reason,
        remarks: formData.remarks,
        html
      });
      setView("list");
      setFormData({
        type: "cn",
        invoiceRef: "",
        reason: "",
        amount: "",
        date: "",
        remarks: "",
        gstType: ""
      })
    } catch (e) {
      console.error("Failed to save CN/DN note", e);
    }
  }

  const handleProceedClick = () => {
    setView("preview")
  }

  const columns = useMemo<ColumnDef<Note>[]>(
    () => [
      {
        accessorKey: "noteNumber",
        header: ({ column }) => <SortableHeader column={column} title="Vendor CN/DN Note No." />,
        cell: ({ row }) => {
          const url = (row.original as any)?.azure_blob_url || (row.original as any)?.azureBlobUrl;
          return (
            <div className="flex items-center gap-2 font-medium text-primary cursor-pointer hover:underline">
              <Receipt className="h-4 w-4" />
              {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {row.getValue("noteNumber")}
                </a>
              ) : (
                row.getValue("noteNumber")
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
          const type = row.getValue("type") as string
          return (
            <Badge variant={type === "Credit Note" ? "outline" : "secondary"} className={type === "Credit Note" ? "text-purple-600 border-purple-200 bg-purple-50" : "text-orange-600 border-orange-200 bg-orange-50"}>
              {type}
            </Badge>
          )
        }
      },
      {
        accessorKey: "invoiceRef",
        header: "Linked Bill",
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("invoiceRef")}</span>
      },
      {
        accessorKey: "customerOrVendor",
        header: ({ column }) => <SortableHeader column={column} title="Party Name" />,
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => <span className="truncate max-w-[150px] inline-block" title={row.getValue("reason")}>{row.getValue("reason")}</span>
      },
      {
        accessorKey: "amount",
        header: ({ column }) => <div className="text-center"><SortableHeader column={column} title="Amount" /></div>,
        cell: ({ row }) => {
          const amount = parseFloat(row.getValue("amount"))
          return <div className="text-center font-medium">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)}</div>
        },
        },
    ],
    []
  )

  const pendingApprovals = displayNotes.filter(n => n.status.includes("Pending"))
  
  const selectedVendorInvoice = vendorInvoices?.find(inv => inv.invoice_number === formData.invoiceRef);

  return (
    <div className="flex-1 space-y-6 pb-8 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {view !== "list" && (
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => setView("list")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {view === "list" && (
            <Link to="/invoice">
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {view === "list" ? "Vendor CN/DN" : view === "create" ? "Vendor Issue CN/ DN" : view === "preview" ? "Vendor CN/DN Invoice" : "Pending Approvals"}
            </h2>
            <p className="text-muted-foreground mt-1">
              {view === "list" ? "Manage Credit and Debit notes linked to vendor bills." : view === "create" ? "Create a new Credit or Debit note." : view === "preview" ? "Review and issue the note." : "Multi-layer approval queue for pending notes."}
            </p>
          </div>
        </div>

        {view === "list" && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setView("create")}>
              <Plus className="mr-2 h-4 w-4" />
              Vendor Issue CN/ DN
            </Button>
          </div>
        )}
      </div>

      {view === "list" ? (
        <Card>
          <CardHeader>
            <CardTitle>Issued Notes</CardTitle>
            <CardDescription>All credit and debit notes issued in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={displayNotes} />
          </CardContent>
        </Card>
      ) : view === "create" ? (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Note Details</CardTitle>
            <CardDescription>Issue a new note against an existing vendor bill.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-destructive">Note Type *</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="cn">Credit Note (CN)</option>
                  <option value="dn">Debit Note (DN)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-destructive">Link to Vendor Bill *</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.invoiceRef}
                  onChange={(e) => setFormData({ ...formData, invoiceRef: e.target.value })}
                >
                  <option value="">Select an existing bill...</option>
                  {vendorInvoices?.map(inv => (
                    <option key={inv.id} value={inv.invoice_number}>{inv.invoice_number} ({inv.vendor_name})</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">CN/DN must be linked to an original vendor bill.</p>
                {formData.invoiceRef && vendorInvoices?.find(inv => inv.invoice_number === formData.invoiceRef)?.linked_customer_invoice && (
                  <p className="text-xs font-medium text-blue-600 mt-1">
                    Linked to Customer Invoice: {vendorInvoices.find(inv => inv.invoice_number === formData.invoiceRef)?.linked_customer_invoice}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-destructive">Reason *</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                >
                  <option value="">Select reason...</option>
                  <option value="Wrong billing by vendor">Wrong billing by vendor</option>
                  <option value="Debit by vendor">Debit by vendor</option>
                  <option value="Short billing by vendor">Short billing by vendor</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Adjustment Amount</label>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date of Issue</label>
                <Input 
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>


            </div>

            <div className="space-y-2 pt-4 border-t">
              <label className="text-sm font-medium">Remarks / Description</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Enter detailed description for this adjustment..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              ></textarea>
            </div>

            <div className="flex justify-end pt-6 border-t gap-2">
              <Button variant="outline" onClick={() => setView("list")}>Cancel</Button>
              <Button variant="default" onClick={handleProceedClick}>Proceed</Button>
            </div>
          </CardContent>
        </Card>
      ) : view === "preview" ? (
        <div className="space-y-4 print-container relative w-full overflow-x-auto min-w-[700px]">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #printable-invoice, #printable-invoice * { visibility: visible; }
              #printable-invoice {
                position: fixed; left: 0; top: 0; width: 100%;
                -webkit-print-color-adjust: exact; print-color-adjust: exact;
              }
              .print\\:hidden { display: none !important; }
              @page { margin: 0; }
            }
          `}</style>

          <div className="flex justify-end gap-2 mb-4 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={() => setView("create")}>Cancel</Button>
            <Button variant="default" onClick={handleAddNote}>Confirm</Button>
          </div>

          <div id="printable-invoice" className="bg-white p-6 min-w-[700px] max-w-4xl text-black border border-gray-200 shadow-sm mx-auto">
            <div className="border-[2px] border-black bg-white">
              <div className="bg-[#ffff00] text-center p-4 border-b-[2px] border-black">
                <h1 className="font-bold text-lg">{selectedVendorInvoice?.vendor_name || "Vendor Company Name and Vendor Name"}</h1>
                <p className="text-sm font-medium mt-1">{selectedVendorInvoice?.vendor_address || "Vendor Address and Contact Details"}</p>
              </div>

              <div className="text-center font-bold border-b-[2px] border-black uppercase text-[15px] tracking-wide py-0.5 underline">
                {formData.type === "cn" ? "Credit Note" : "Debit Note"}
              </div>

              <div className="grid grid-cols-2 border-b-[2px] border-black text-sm">
                <div className="border-r-[2px] border-black p-0.5 grid grid-cols-[140px_1fr] items-center">
                  <span className="font-bold pl-1 text-[12px]">Note No.</span>
                  <span className="px-1 py-0.5 ml-1 text-[12px]">: {currentNoteNumber}</span>
                </div>
                <div className="p-0.5 grid grid-cols-[140px_1fr] items-center">
                  <span className="font-bold pl-1 text-[12px]">Date</span>
                  <span className="px-1 py-0.5 ml-1 text-[12px]">: {formData.date || "10-July-2026"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 border-b-[2px] border-black text-sm">
                <div className="border-r-[2px] border-black p-0.5 grid grid-cols-[140px_1fr] items-center">
                  <span className="font-bold pl-1 text-[12px]">Our GSTIN</span>
                  <span className="px-1 py-0.5 ml-1 text-[12px]">: </span>
                </div>
                <div className="p-0.5 grid grid-cols-[140px_1fr] items-center flex gap-1">
                  <span className="font-bold pl-1 text-[12px]">Invoice Under RCM</span>
                  <span className="px-1 text-[12px] flex items-center gap-1">
                     : <span className="line-through decoration-2">Yes</span> No
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 border-b-[2px] border-black text-sm">
                <div className="border-r-[2px] border-black p-0.5 grid grid-cols-[140px_1fr] items-center">
                  <span className="font-bold pl-1 text-[12px]">Service Category</span>
                  <span className="px-1 py-0.5 ml-1 text-[12px]">: Transportation</span>
                </div>
                <div className="p-0.5 grid grid-cols-[140px_1fr] items-center">
                  <span className="font-bold pl-1 text-[12px]">Customer PO No.</span>
                  <span className="px-1 py-0.5 ml-1 text-[12px]">: Agreement</span>
                </div>
              </div>

              <div className="grid grid-cols-2 border-b-[2px] border-black text-sm">
                <div className="border-r-[2px] border-black p-1 flex flex-col">
                  <div className="font-bold flex items-center gap-2 pl-1 text-[12px]">
                    <span className="underline">Invoice To :-</span>
                    <span className="font-bold">GSTIN - 07AAFCC4715N1ZG</span>
                  </div>
                  <div className="font-bold mt-1 p-1 flex-1 text-[11px] leading-snug">
                    Cogent Logistics Private Limited<br/>
                    201C/6, 2nd Floor, D-21 Corporate Park,<br/>
                    Sector 21, Dwarka, New Delhi - 110077
                  </div>
                </div>
                <div className="p-1 flex flex-col">
                  <div className="font-bold underline pl-1 text-[12px]">
                    Invoice For/ Place Of Supply :-
                  </div>
                  <div className="font-bold mt-1 p-1 flex-1 text-[11px] leading-snug">
                    Cogent Logistics Private Limited<br/>
                    201C/6, 2nd Floor, D-21 Corporate Park, Sector 21,<br/>
                    Dwarka, New Delhi - 110077
                  </div>
                </div>
              </div>
              
              <div className="text-center font-bold border-b-[2px] border-black uppercase text-[12px] py-0.5">
                Article Description
              </div>
              <div className="text-center font-bold border-b-[2px] border-black text-[11px] py-1">
                Fix Transportation Charges UP for the Period Of 1st June to 30th June 2026 (as per annexure attached)
              </div>

              <table className="w-full text-center border-b-[2px] border-black text-sm">
                <thead>
                  <tr className="border-b-[2px] border-black font-bold text-[12px]">
                    <th className="border-r-[2px] border-black p-1 w-12">S No</th>
                    <th className="border-r-[2px] border-black p-1 w-24">HSN/SAC</th>
                    <th className="border-r-[2px] border-black p-1">Description</th>
                    <th className="border-r-[2px] border-black p-1 w-24">Cost Code</th>
                    <th className="p-1 w-32">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b-[2px] border-black">
                    <td className="border-r-[2px] border-black p-1 text-[12px]">1</td>
                    <td className="border-r-[2px] border-black p-1 text-[12px]">996601</td>
                    <td className="border-r-[2px] border-black p-1 text-[12px]">Transportation Charges</td>
                    <td className="border-r-[2px] border-black p-1 text-[12px]">4477</td>
                    <td className="p-1 text-[12px]">{formData.amount || "0"}</td>
                  </tr>
                  <tr className="h-[24px] border-b-[2px] border-black">
                    <td className="border-r-[2px] border-black"></td>
                    <td className="border-r-[2px] border-black"></td>
                    <td className="border-r-[2px] border-black"></td>
                    <td className="border-r-[2px] border-black"></td>
                    <td></td>
                  </tr>
                  <tr className="h-[24px]">
                    <td className="border-r-[2px] border-black"></td>
                    <td className="border-r-[2px] border-black"></td>
                    <td className="border-r-[2px] border-black text-center font-bold text-[12px]">Total</td>
                    <td className="border-r-[2px] border-black border-t-[2px] border-t-black border-b-[2px] border-b-black text-center text-[12px]">Total</td>
                    <td className="font-bold text-[12px] border-t-[2px] border-t-black border-b-[2px] border-b-black">{formData.amount || "0"}</td>
                  </tr>
                </tbody>
              </table>
              
              <div className="text-sm border-b-[2px] border-black">
                <div className="font-bold underline p-1 text-[12px]">Our Bank Details :-</div>
                <div className="grid grid-cols-[160px_1fr] border-t-[2px] border-black text-[11px]">
                  <div className="border-r-[2px] border-black p-0.5 pl-1">Account Holder Name</div>
                  <div className="p-0.5 pl-1">{selectedVendorInvoice?.account_holder_name || selectedVendorInvoice?.vendor_name || ""}</div>
                </div>
                <div className="grid grid-cols-[160px_1fr] border-t-[1px] border-black text-[11px]">
                  <div className="border-r-[2px] border-black p-0.5 pl-1">Bank Name</div>
                  <div className="p-0.5 pl-1">{selectedVendorInvoice?.bank_name || ""}</div>
                </div>
                <div className="grid grid-cols-[160px_1fr] border-t-[1px] border-black text-[11px]">
                  <div className="border-r-[2px] border-black p-0.5 pl-1">Account No.</div>
                  <div className="p-0.5 pl-1">{selectedVendorInvoice?.account_number || ""}</div>
                </div>
                <div className="grid grid-cols-[160px_1fr] border-t-[1px] border-black text-[11px]">
                  <div className="border-r-[2px] border-black p-0.5 pl-1">IFSC Code</div>
                  <div className="p-0.5 pl-1">{selectedVendorInvoice?.ifsc_code || ""}</div>
                </div>
                <div className="grid grid-cols-[160px_1fr] border-t-[1px] border-black text-[11px]">
                  <div className="border-r-[2px] border-black p-0.5 pl-1">Branch</div>
                  <div className="p-0.5 pl-1">{selectedVendorInvoice?.branch_name || ""}</div>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_80px_120px] border-b-[2px] border-black text-sm">
                <div className="border-r-[2px] border-black font-bold p-1 text-[12px] flex flex-col justify-center items-start pl-2">
                  <span className="underline">Amount in Words :</span>
                  <span className="font-normal text-[10px] leading-tight mt-1">{numberToWords(Number(formData.amount || 0))}</span>
                </div>
                <div className="border-r-[2px] border-black font-bold p-1 flex items-center justify-center text-[12px]">
                  Total
                </div>
                <div className="font-bold p-1 flex items-center justify-center text-[12px]">
                  {formData.amount || "0"}
                </div>
              </div>

              <div className="p-2 h-20 relative text-sm border-b-[2px] border-black bg-white">
                <div className="absolute top-2 right-2 font-bold text-[12px]">For Cogent Logistics Private Limited</div>
                <div className="absolute bottom-2 right-2 text-center w-48">
                  <div className="pt-1 text-[12px]">Authorised Signatory</div>
                </div>
              </div>
              
              <div className="p-1 text-[10px] text-center font-medium leading-tight bg-white">
                Note: Under this invoice,we are providing services by way of transportation of goods by road to a Goods<br/>
                Transportation Agency. Services provided by us are exempted from payment of GST as per notification issued by<br/>
                Govt.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Layer 1: Ops Head Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-500">
                  {pendingApprovals.filter(a => a.status === "Pending Ops Head").length}
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  Layer 2: CEO Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-500">
                  {displayNotes.filter(a => a.status === "Pending CEO").length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Approval Queue</CardTitle>
              <CardDescription>2-layer approval workflow (Ops Head → CEO) required before finalization.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={pendingApprovals} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
