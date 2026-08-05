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
import { useCustomerInvoices, useCustomerCNDNs, useCreateCustomerCNDN } from "../../invoicing/hooks/useCustomerInvoices"
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
  { id: "1", noteNumber: "CN-2024-001", type: "Credit Note", invoiceRef: "INV-2024-001", customerOrVendor: "Acme Corp", amount: 1500.00, date: "2024-03-05", reason: "Short billing by us", status: "Approved" },
  { id: "2", noteNumber: "DN-2024-001", type: "Debit Note", invoiceRef: "VB-2024-089", customerOrVendor: "Globex Inc", amount: 850.00, date: "2024-03-12", reason: "Debit by customer", status: "Pending Ops Head" },
  { id: "3", noteNumber: "CN-2024-002", type: "Credit Note", invoiceRef: "INV-2024-042", customerOrVendor: "Soylent Corp", amount: 5000.00, date: "2024-03-18", reason: "Wrong billing by us", status: "Pending CEO" },
]

export default function CNDNManagement() {
  const [view, setView] = useState<"list" | "create" | "approvals" | "preview">("list")
  const { data: customerInvoices } = useCustomerInvoices("2025-2026");
  const { data: dbNotes } = useCustomerCNDNs();
  const createCustomerCNDN = useCreateCustomerCNDN();
  
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

  const selectedCustomerInvoice = customerInvoices?.find(inv => inv.invoiceNumber === formData.invoiceRef);
  const currentNoteNumber = `${formData.type === "cn" ? "CN" : "DN"}-2025-00${(displayNotes?.length || 0) + 1}`;

  const handleAddNote = async () => {
    const invoiceContent = document.getElementById('printable-invoice')?.outerHTML || "";
    const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    const stylesHtml = styleElements.map(el => el.outerHTML).join('\n');
    const tailwindCdn = `<script src="https://cdn.tailwindcss.com"></script>`;
    
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          ${tailwindCdn}
          ${stylesHtml}
          <style>
            body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            #printable-invoice { position: static !important; }
          </style>
        </head>
        <body>
          ${invoiceContent}
        </body>
      </html>
    `;

    try {
      await createCustomerCNDN.mutateAsync({
        noteNumber: currentNoteNumber,
        type: formData.type,
        customerInvoiceRef: formData.invoiceRef,
        amount: parseFloat(formData.amount) || 0,
        date: formData.date || new Date().toISOString().split('T')[0],
        reason: formData.reason,
        remarks: formData.remarks,
        html: fullHtml
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
      });
    } catch (error) {
      console.error("Failed to save CN/DN note", error);
    }
  }

  const handleProceedClick = () => {
    if ((formData.type === "cn" || formData.type === "dn") && (formData.gstType === "without_gst" || formData.gstType === "with_gst")) {
      setView("preview")
    } else {
      handleAddNote()
    }
  }

  const columns = useMemo<ColumnDef<Note>[]>(
    () => [
      {
        accessorKey: "noteNumber",
        header: ({ column }) => <SortableHeader column={column} title="Note #" />,
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
        header: "Linked Invoice",
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
      {
        accessorKey: "status",
        header: "Approval Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string
          return (
            <Badge
              variant={
                status === "Approved" ? "success" :
                  status.includes("Pending") ? "warning" :
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

  const pendingApprovals = mockNotes.filter(n => n.status.includes("Pending"))

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
              {view === "list" ? "Customer CN/DN" : view === "create" ? "Issue CN / DN" : view === "preview" ? "Customer Invoice CN/DN" : "Pending Approvals"}
            </h2>
            <p className="text-muted-foreground mt-1">
              {view === "list" ? "Manage Credit and Debit notes linked to invoices." : view === "create" ? "Create a new Credit or Debit note." : view === "preview" ? "Review and issue the note." : "Multi-layer approval queue for pending notes."}
            </p>
          </div>
        </div>

        {view === "list" && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setView("create")}>
              <Plus className="mr-2 h-4 w-4" />
              Issue CN / DN
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
            <CardDescription>Issue a new note against an existing invoice.</CardDescription>
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
                <label className="text-sm font-medium text-destructive">Link to Invoice *</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.invoiceRef}
                  onChange={(e) => setFormData({ ...formData, invoiceRef: e.target.value })}
                >
                  <option value="">Select an existing invoice...</option>
                  {customerInvoices?.map(inv => (
                    <option key={inv.invoiceNumber} value={inv.invoiceNumber}>
                      {inv.invoiceNumber}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">CN/DN must be linked to an original invoice.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-destructive">Reason *</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                >
                  <option value="">Select reason...</option>
                  <option value="Wrong billing by us">Wrong billing by us</option>
                  <option value="Debit by customer">Debit by customer</option>
                  <option value="Short billing by us">Short billing by us</option>
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

              <div className="space-y-2">
                <label className="text-sm font-medium">GST Type</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.gstType}
                  onChange={(e) => setFormData({ ...formData, gstType: e.target.value })}
                >
                  <option value="">Select GST Type...</option>
                  <option value="with_gst">With GST</option>
                  <option value="without_gst">Without GST</option>
                </select>
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
              <Button variant="default" onClick={handleProceedClick}>Proceed </Button>
            </div>
          </CardContent>
        </Card>
      ) : view === "preview" ? (
        <div className="w-full overflow-x-auto pb-4">
        <style>{`
          @media print {
            html, body, #root {
              height: auto !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            body * {
              visibility: hidden;
            }
            #printable-invoice, #printable-invoice * {
              visibility: visible;
            }
            #printable-invoice {
              position: fixed;
              left: 0;
              top: 0;
              width: 100%;
              min-width: 800px;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}</style>
        <Card id="printable-invoice" className="max-w-4xl min-w-[750px] mx-auto bg-white text-black p-8 relative">
           <div className="absolute top-4 right-4 flex gap-2 print:hidden">
              <Button variant="outline" onClick={() => window.print()}>
                 <Download className="mr-2 h-4 w-4" />
                 Download PDF
              </Button>
              <Button variant="outline" onClick={() => setView("create")}>Cancel</Button>
              <Button variant="default" onClick={handleAddNote}>Confirm</Button>
           </div>
           
           <div className="text-center mb-6 pt-12">
              <h1 className="text-4xl font-extrabold text-[#006bb6] tracking-tight" style={{ fontFamily: "Arial, sans-serif" }}>cogentes</h1>
              <h2 className="text-xl font-bold mt-2">Cogent Logistics Private Limited</h2>
              <p className="text-xs font-semibold mt-1">CIN No.: U63040DL2013PTC260297</p>
              <p className="text-[11px] mt-1">201C/6, Second Floor, D-21 Corporate Park, Sector.-21, Dwarka, New Delhi - 110077 India</p>
              <p className="text-[11px]">Email: info@cogentlogistics.in, Web: www.cogentlogistics.in, Phone: +91 1141099971</p>
           </div>
           
           {formData.gstType === "without_gst" ? (
           <div className="border-[2px] border-black">
              <div className="text-center font-bold border-b-[2px] border-black uppercase text-[15px] tracking-wide py-0.5">
                {formData.type === "cn" ? "Credit Note" : "Debit Note"}
              </div>
              
              <div className="grid grid-cols-2 border-b-[2px] border-black text-sm">
                <div className="border-r-[2px] border-black flex items-stretch">
                   <div className="w-[120px] font-bold p-1 pl-2 text-[12px] flex items-center">{formData.type === "cn" ? "CN No." : "DN No."}</div>
                   <div className="flex-1 bg-[#fcb900] font-bold p-1 text-[12px] border-l-[2px] border-black flex items-center">
                     : {currentNoteNumber}
                   </div>
                </div>
                <div className="flex items-stretch">
                   <div className="w-[120px] font-bold p-1 pl-2 text-[12px] flex items-center">Date</div>
                   <div className="flex-1 bg-[#fcb900] font-bold p-1 text-[12px] border-l-[2px] border-black flex items-center">
                     : {new Date(formData.date || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                   </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 border-b-[2px] border-black text-sm">
                <div className="border-r-[2px] border-black flex items-stretch">
                   <div className="w-[120px] font-bold p-1 pl-2 text-[12px] flex items-center">GST No.</div>
                   <div className="flex-1 p-1 pl-2 text-[12px] flex items-center border-l-[2px] border-transparent">
                     : {selectedCustomerInvoice?.gstin || "N/A"}
                   </div>
                </div>
                <div className="flex items-stretch">
                   <div className="w-[120px] font-bold p-1 pl-2 text-[12px] flex items-center">Our PAN No.</div>
                   <div className="flex-1 p-1 pl-2 text-[12px] flex items-center border-l-[2px] border-transparent">
                     : {selectedCustomerInvoice?.gstin ? selectedCustomerInvoice.gstin.substring(2, 12) : "N/A"}
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-2 border-b-[2px] border-black text-sm">
                <div className="border-r-[2px] border-black flex items-stretch">
                   <div className="w-[120px] font-bold p-1 pl-2 text-[12px] flex items-center">Service Category</div>
                   <div className="flex-1 p-1 pl-2 text-[12px] flex items-center border-l-[2px] border-transparent">
                     : Transportation
                   </div>
                </div>
                <div className="flex items-stretch">
                   <div className="w-[120px] font-bold p-1 pl-2 text-[12px] flex items-center">Customer VO No.</div>
                   <div className="flex-1 p-1 pl-2 text-[12px] flex items-center border-l-[2px] border-transparent">
                     : Agreement
                   </div>
                </div>
              </div>

              <div className="p-1 border-b-[2px] border-black font-bold pl-2 text-[12px] underline bg-[#e2e8f0]">
                 Credit To :- 
              </div>
              
              <div className="grid grid-cols-2 border-b-[2px] border-black text-sm">
                 <div className="border-r-[2px] border-black flex flex-col">
                    <div className="font-bold flex items-stretch text-[12px]">
                       <div className="underline w-[100px] p-1 flex items-center">Invoice To :-</div>
                       <div className="bg-[#fcb900] p-1 font-bold border-l-[2px] border-b-[2px] border-black flex-1 flex items-center">GSTIN - {selectedCustomerInvoice?.gstin || "N/A"}</div>
                    </div>
                    <div className="bg-[#fcb900] font-bold p-2 flex-1 text-[11px] leading-snug">
                       {selectedCustomerInvoice?.customerName || "Customer Name"}<br/>
                       {selectedCustomerInvoice?.billing_address || "Customer Address"}
                    </div>
                 </div>
                 <div className="flex flex-col">
                    <div className="font-bold underline p-1 pl-2 text-[12px] h-[32px] flex items-center">
                       Invoice For/ Place Of Supply :-
                    </div>
                    <div className="bg-[#fcb900] font-bold p-2 flex-1 text-[11px] leading-snug border-t-[2px] border-black">
                       M/s Flipkart India FK GTA Non Trade,<br/>
                       KH NO 14/6 MIN, 7 MIN, 13 MIN, 14, 15, 17, 18, MIN, 23, 24, 25, 16/1, 2,<br/>
                       9, 10, 11, 12/1, 17/3, 4, 5, 6, 7, 8, 11/2, 12, 13, 14, 15 BINOLLA, Gurugram, Gurugram,<br/>
                       Haryana, 122413
                    </div>
                 </div>
              </div>

              <table className="w-full text-center border-b-[2px] border-black text-sm table-fixed">
                 <thead>
                    <tr className="border-b-[2px] border-black font-bold text-[12px]">
                       <th className="border-r-[2px] border-black p-1 w-12"></th>
                       <th className="border-r-[2px] border-black p-1">Article Description</th>
                       <th className="border-r-[2px] border-black p-1 w-24">HSN/SAC</th>
                       <th className="border-r-[2px] border-black p-1 w-24">Cost Code</th>
                       <th className="p-1 w-32">Amount</th>
                    </tr>
                 </thead>
                 <tbody>
                    <tr>
                       <td className="border-r-[2px] border-black p-1 align-top pt-2 text-[12px]">1</td>
                       <td className="border-r-[2px] border-black p-1 bg-[#fcb900] text-left align-top pt-2 text-[11px] px-2 font-medium break-words whitespace-normal">
                          {formData.type === "cn" ? "Credit Note" : "Debit Note"} Against Inv No. {formData.invoiceRef} Dt {selectedCustomerInvoice?.date ? new Date(selectedCustomerInvoice.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}. Reason: {formData.reason}. {formData.remarks}
                       </td>
                       <td className="border-r-[2px] border-black p-1 bg-[#fcb900] align-top pt-2 text-[12px]">996601</td>
                       <td className="border-r-[2px] border-black p-1 bg-[#fcb900] align-top pt-2 text-[12px]">4462</td>
                       <td className="p-1 align-top pt-2 text-center text-[12px]">{parseFloat(formData.amount || "0").toFixed(2)}</td>
                    </tr>
                    <tr className="h-[100px]">
                       <td className="border-r-[2px] border-black"></td>
                       <td className="border-r-[2px] border-black"></td>
                       <td className="border-r-[2px] border-black"></td>
                       <td className="border-r-[2px] border-black"></td>
                       <td></td>
                    </tr>
                 </tbody>
              </table>

              <div className="grid grid-cols-[1fr_220px] border-b-[2px] border-black text-sm">
                 <div className="border-r-[2px] border-black flex flex-col">
                    <div className="font-bold underline p-1 pl-2 border-b-[2px] border-black text-[12px]">Amount in Words :</div>
                    <div className="bg-[#fcb900] p-1 pl-2 font-medium flex-1 text-[12px]">
                       {numberToWords(Math.round(parseFloat(formData.amount) || 0))} Rupees Only
                    </div>
                 </div>
                 <div className="flex flex-col font-bold">
                    <div className="grid grid-cols-[1fr_100px] border-b-[2px] border-black flex-1">
                       <div className="border-r-[2px] border-black p-1 flex items-center justify-center text-[12px]">Sub Total</div>
                       <div className="p-1 bg-[#fcb900] flex items-center justify-center text-[12px]">{parseFloat(formData.amount || "0").toFixed(2)}</div>
                    </div>
                    <div className="grid grid-cols-[1fr_100px] flex-1">
                       <div className="border-r-[2px] border-black p-1 flex items-center justify-center text-[12px]">Grand Total</div>
                       <div className="p-1 bg-[#fcb900] flex items-center justify-center text-[12px]">{Math.round(parseFloat(formData.amount || "0")).toFixed(2)}</div>
                    </div>
                 </div>
              </div>

              <div className="p-2 h-28 relative text-sm border-b-[2px] border-black bg-white">
                 <div className="absolute top-2 right-2 font-bold text-[12px]">For Cogent Logistics Private Limited</div>
                 <div className="absolute bottom-2 right-2 text-center w-48">
                    <div className="pt-1 text-[12px]">Authorised Signatory</div>
                 </div>
              </div>
              
              <div className="p-1.5 text-[10px] text-center font-medium leading-tight bg-white">
                 Note: Under this invoice,we are providing services by way of transportation of goods by road to a<br/> Goods Transportation Agency. Services provided by us are exempted from payment of GST as per
              </div>
           </div>
           ) : (
           <div className="border-[2px] border-black">
              <div className="text-center font-bold border-b-[2px] border-black uppercase text-[15px] tracking-wide py-0.5">
                {formData.type === "cn" ? "Credit Note" : "Debit Note"}
              </div>
              
              <div className="grid grid-cols-2 border-b-[2px] border-black text-sm">
                <div className="border-r-[2px] border-black flex items-stretch">
                   <div className="w-[120px] font-bold p-1 pl-2 text-[12px] flex items-center">{formData.type === "cn" ? "CN No." : "DN No."}</div>
                   <div className="flex-1 bg-[#fcb900] font-bold p-1 text-[12px] border-l-[2px] border-black flex items-center">
                     : {currentNoteNumber}
                   </div>
                </div>
                <div className="flex items-stretch">
                   <div className="w-[120px] font-bold p-1 pl-2 text-[12px] flex items-center">Date</div>
                   <div className="flex-1 bg-[#fcb900] font-bold p-1 text-[12px] border-l-[2px] border-black flex items-center">
                     : {new Date(formData.date || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                   </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 border-b-[2px] border-black text-sm">
                <div className="border-r-[2px] border-black flex items-stretch">
                   <div className="w-[120px] font-bold p-1 pl-2 text-[12px] flex items-center">GST No.</div>
                   <div className="flex-1 p-1 pl-2 text-[12px] flex items-center border-l-[2px] border-transparent">
                     : {selectedCustomerInvoice?.gstin || "N/A"}
                   </div>
                </div>
                <div className="flex items-stretch">
                   <div className="w-[120px] font-bold p-1 pl-2 text-[12px] flex items-center">Our PAN No.</div>
                   <div className="flex-1 p-1 pl-2 text-[12px] flex items-center border-l-[2px] border-transparent">
                     : {selectedCustomerInvoice?.gstin ? selectedCustomerInvoice.gstin.substring(2, 12) : "N/A"}
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-2 border-b-[2px] border-black text-sm">
                <div className="border-r-[2px] border-black flex items-stretch">
                   <div className="w-[120px] font-bold p-1 pl-2 text-[12px] flex items-center">Service Category</div>
                   <div className="flex-1 p-1 pl-2 text-[12px] flex items-center border-l-[2px] border-transparent">
                     : Transportation
                   </div>
                </div>
                <div className="flex items-stretch">
                   <div className="w-[120px] font-bold p-1 pl-2 text-[12px] flex items-center">Customer WO No.</div>
                   <div className="flex-1 bg-[#fcb900] font-bold p-1 text-[12px] border-l-[2px] border-black flex items-center">
                     : PO2414565700
                   </div>
                </div>
              </div>

              <div className="p-1 border-b-[2px] border-black font-bold pl-2 text-[12px] underline bg-[#e2e8f0]">
                 Credit To :- 
              </div>
              
              <div className="grid grid-cols-2 border-b-[2px] border-black text-sm">
                 <div className="border-r-[2px] border-black flex flex-col">
                    <div className="font-bold flex items-stretch text-[12px]">
                       <div className="underline w-[100px] p-1 flex items-center">Invoice To :-</div>
                       <div className="bg-[#fcb900] p-1 font-bold border-l-[2px] border-b-[2px] border-black flex-1 flex items-center">GSTIN - {selectedCustomerInvoice?.gstin || "N/A"}</div>
                    </div>
                    <div className="bg-[#fcb900] font-bold p-2 flex-1 text-[12px] leading-snug">
                       {selectedCustomerInvoice?.customerName || "Customer Name"}<br/>
                       {selectedCustomerInvoice?.billing_address || "Customer Address"}
                    </div>
                 </div>
                 <div className="flex flex-col">
                    <div className="font-bold underline p-1 pl-2 text-[12px] h-[32px] flex items-center">
                       Invoice For/ Place Of Supply :-
                    </div>
                    <div className="bg-[#fcb900] font-bold p-2 flex-1 text-[12px] leading-snug border-t-[2px] border-black">
                       M/s Instakart Services Pvt Ltd,<br/>
                       Shop No. 10, 11, Ground Floor, Shivam<br/>
                       center Point Opp. Amar Ujala press,<br/>
                       National Highway 2, Agra-282007 Uttar<br/>
                       Pradesh
                    </div>
                 </div>
              </div>

              <table className="w-full text-center border-b-[2px] border-black text-sm table-fixed">
                 <thead>
                    <tr className="border-b-[2px] border-black font-bold text-[12px]">
                       <th className="border-r-[2px] border-black p-1 w-16"></th>
                       <th className="border-r-[2px] border-black p-1">Article Description</th>
                       <th className="p-1 w-40">Amount</th>
                    </tr>
                 </thead>
                 <tbody>
                    <tr>
                       <td className="border-r-[2px] border-black p-1 align-top pt-2 text-[12px]">1</td>
                       <td className="border-r-[2px] border-black p-1 bg-[#fcb900] text-center align-top pt-2 text-[12px] px-2 font-medium break-words whitespace-normal">
                          {formData.type === "cn" ? "Credit Note" : "Debit Note"} Against Inv No. {formData.invoiceRef} Dt {selectedCustomerInvoice?.date ? new Date(selectedCustomerInvoice.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}. Reason: {formData.reason}. {formData.remarks}
                       </td>
                       <td className="p-1 align-top pt-2 text-center text-[12px]">{parseFloat(formData.amount || "0").toFixed(2)}</td>
                    </tr>
                    <tr className="h-[100px]">
                       <td className="border-r-[2px] border-black"></td>
                       <td className="border-r-[2px] border-black"></td>
                       <td></td>
                    </tr>
                 </tbody>
              </table>

              <div className="grid grid-cols-[1fr_220px] border-b-[2px] border-black text-sm">
                 <div className="border-r-[2px] border-black flex flex-col">
                    <div className="font-bold underline p-1 pl-2 border-b-[2px] border-black text-[12px]">Amount in Words :</div>
                    <div className="p-1 pl-2 font-medium flex-1 text-[12px]">
                       {numberToWords(Math.round((parseFloat(formData.amount) || 0) * 1.18))} Rupees Only
                    </div>
                 </div>
                 <div className="flex flex-col font-bold">
                    <div className="grid grid-cols-[1fr_100px] border-b-[2px] border-black flex-1">
                       <div className="border-r-[2px] border-black p-1 flex items-center justify-center text-[12px]">Sub Total</div>
                       <div className="p-1 flex items-center justify-center text-[12px] font-normal">{parseFloat(formData.amount || "0").toFixed(2)}</div>
                    </div>
                    <div className="grid grid-cols-[1fr_100px] border-b-[2px] border-black flex-1">
                       <div className="border-r-[2px] border-black p-1 flex items-center justify-center text-[12px]">IGST 18%</div>
                       <div className="p-1 flex items-center justify-center text-[12px] font-normal">{(parseFloat(formData.amount || "0") * 0.18).toFixed(2)}</div>
                    </div>
                    <div className="grid grid-cols-[1fr_100px] flex-1">
                       <div className="border-r-[2px] border-black p-1 flex items-center justify-center text-[12px]">Grand Total</div>
                       <div className="p-1 flex items-center justify-center text-[12px] font-normal">{Math.round((parseFloat(formData.amount || "0")) * 1.18).toFixed(2)}</div>
                    </div>
                 </div>
              </div>

              <div className="p-2 h-28 relative text-sm bg-white">
                 <div className="absolute top-2 right-2 font-bold text-[12px]">For Cogent Logistics Private Limited</div>
                 <div className="absolute bottom-2 right-2 text-center w-48">
                    <div className="pt-1 text-[12px]">Authorised Signatory</div>
                 </div>
              </div>
           </div>
           )}
        </Card>
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
                  {pendingApprovals.filter(a => a.status === "Pending CEO").length}
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
