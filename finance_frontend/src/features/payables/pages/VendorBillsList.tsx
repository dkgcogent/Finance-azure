import React, { useMemo, useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable, SortableHeader } from "@/components/shared/DataTable"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Download,
  Plus,
  FileText,
  UploadCloud,
  X,
  CheckCircle2,
  Ban,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  ArrowLeft
} from "lucide-react"
import NewVendorBill from "./NewVendorBill"
import { numberToWords } from "@/lib/utils"
import { useVendorInvoices } from "../hooks/useVendorInvoices"

type Bill = {
  id: string
  billNumber: string
  vendorName: string
  date: string
  dueDate: string
  amount: number
  status: "Paid" | "Pending Verification" | "Approved" | "Rejected" | "Draft"
}



export default function VendorBillsList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "vendors">("pending")
  const [showUpload, setShowUpload] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedBill, setSelectedBill] = useState<any | null>(null)

  const { data: vendorInvoices = [] } = useVendorInvoices();
  const bills = vendorInvoices.map((inv: any) => ({
    id: String(inv.id),
    billNumber: inv.invoice_number,
    vendorName: inv.vendor_name,
    date: inv.date,
    dueDate: inv.due_date,
    amount: Number(inv.amount) || 0,
    status: (inv.status === 'Pending' ? 'Pending Verification' : inv.status) || "Pending Verification",
    azureUrl: inv.azure_blob_url
  }));

  const filteredBills = bills.filter(bill => {
    if (activeTab === "pending") return bill.status === "Pending Verification" || bill.status === "Pending"
    if (activeTab === "approved") return bill.status === "Approved" || bill.status === "Paid"
    if (activeTab === "rejected") return bill.status === "Rejected"
    return true
  })

  const columns = useMemo<ColumnDef<Bill>[]>(
    () => [
      {
        accessorKey: "billNumber",
        header: ({ column }) => <SortableHeader column={column} title="Vendor Invoice No." />,
        cell: ({ row }) => (
          <div
            className="flex items-center gap-2 font-medium text-primary cursor-pointer hover:underline"
            onClick={() => setSelectedBill(row.original)}
          >
            <FileText className="h-4 w-4" />
            {row.getValue("billNumber")}
          </div>
        ),
      },
      {
        accessorKey: "vendorName",
        header: ({ column }) => <SortableHeader column={column} title="Vendor Name" />,
      },
      {
        accessorKey: "date",
        header: ({ column }) => <div className="text-center"><SortableHeader column={column} title="Bill Date" /></div>,
        cell: ({ row }) => {
          const rawDate = row.getValue("date") as string;
          const formatted = rawDate ? new Date(rawDate).toLocaleDateString('en-GB') : '';
          return <div className="text-center">{formatted}</div>;
        }
      },
      {
        accessorKey: "dueDate",
        header: ({ column }) => <div className="text-center"><SortableHeader column={column} title="Due Date" /></div>,
        cell: ({ row }) => {
          const rawDate = row.getValue("dueDate") as string;
          const formatted = rawDate ? new Date(rawDate).toLocaleDateString('en-GB') : '';
          return <div className="text-center">{formatted}</div>;
        }
      },
      {
        accessorKey: "amount",
        header: ({ column }) => <div className="text-center"><SortableHeader column={column} title="Amount" /></div>,
        cell: ({ row }) => {
          const amount = parseFloat(row.getValue("amount")) || 0;
          return <div className="text-center font-medium">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)}</div>
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => setSelectedBill(row.original)}>
            View
          </Button>
        ),
      },
    ],
    []
  )

  const handleDownloadPDF = () => {
    const printArea = document.getElementById('printable-invoice');
    if (!printArea) return;

    const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    const stylesHtml = styleElements.map(el => el.outerHTML).join('\n');

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Vendor Invoice</title>
            ${stylesHtml}
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
            <div style="width: 100%; max-width: 900px; margin: 0 auto; zoom: 0.85;">
              ${printArea.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
      }, 800);
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 10000);
    }
  };

  if (showUpload) {
    return <NewVendorBill onCancel={() => setShowUpload(false)} />
  }

  if (selectedBill) {
    return (
      <div className="flex-1 space-y-6 pb-8 relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => setSelectedBill(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{selectedBill.billNumber}</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-muted-foreground">
                  Vendor Bill Details
                </p>
                <Badge variant={
                  selectedBill.status === "Paid" || selectedBill.status === "Approved" ? "success" :
                    selectedBill.status === "Rejected" ? "destructive" : "default"
                }>
                  {selectedBill.status}
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
        
        <Card id="printable-invoice" className="max-w-4xl mx-auto bg-white text-black p-8 relative print-container">
           <div className="p-6 text-black min-w-[650px] mx-auto bg-white">
             <div className="border-[2px] border-black bg-white text-black">
                <div className="bg-[#fcb900] text-center p-3 border-b-[2px] border-black">
                  <h1 className="font-bold text-lg">{selectedBill.vendorName}</h1>
                  <p className="text-sm font-medium">Vendor Address and Contact Details</p>
                </div>

                <div className="text-center font-bold border-b-[2px] border-black uppercase text-[15px] tracking-wide py-0.5">
                  BILL OF SUPPLY
                </div>

                <div className="grid grid-cols-2 border-b-[2px] border-black text-sm">
                  <div className="border-r-[2px] border-black p-0.5 grid grid-cols-[140px_1fr] items-center">
                    <span className="font-bold pl-1 text-[12px]">Invoice No.</span>
                    <span className="px-1 py-0.5 ml-1 text-[12px]">: {selectedBill.billNumber}</span>
                  </div>
                  <div className="p-0.5 grid grid-cols-[140px_1fr] items-center">
                    <span className="font-bold pl-1 text-[12px]">Date</span>
                    <span className="px-1 py-0.5 ml-1 text-[12px]">: {new Date(selectedBill.date).toLocaleDateString('en-GB')}</span>
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
                      201C/6, 2nd Floor, D-21 Corporate<br/>
                      Park, Sector 21, Dwarka, New Delhi -<br/>
                      110077
                    </div>
                  </div>
                  <div className="p-1 flex flex-col">
                    <div className="font-bold underline pl-1 text-[12px]">
                      Invoice For/ Place Of Supply :-
                    </div>
                    <div className="font-bold mt-1 p-1 flex-1 text-[11px] leading-snug">
                      Cogent Logistics Private Limited<br/>
                      201C/6, 2nd Floor, D-21 Corporate Park, Sector<br/>
                      21, Dwarka, New Delhi - 110077
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
                      <th className="border-r-[2px] border-black p-1 w-24">HSN/SA</th>
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
                      <td className="p-1 text-[12px]">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(selectedBill.amount)}</td>
                    </tr>
                    <tr className="border-b-[2px] border-black">
                      <td className="border-r-[2px] border-black py-2"></td>
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
                      <td className="font-bold text-[12px]">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(selectedBill.amount)}</td>
                    </tr>
                  </tbody>
                </table>
                
                <div className="text-sm border-b-[2px] border-black">
                  <div className="font-bold underline p-1 text-[12px]">Our Bank Details :-</div>
                  <div className="grid grid-cols-[140px_1fr] border-t-[2px] border-black text-[11px]">
                    <div className="border-r-[2px] border-black p-0.5 pl-1">Account Holder Name</div>
                    <div className="p-0.5 text-center">{selectedBill.vendorName}</div>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] border-t-[1px] border-black text-[11px]">
                    <div className="border-r-[2px] border-black p-0.5 pl-1">Bank Name</div>
                    <div></div>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] border-t-[1px] border-black text-[11px]">
                    <div className="border-r-[2px] border-black p-0.5 pl-1">Account No.</div>
                    <div></div>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] border-t-[1px] border-black text-[11px]">
                    <div className="border-r-[2px] border-black p-0.5 pl-1">IFSC Code</div>
                    <div></div>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] border-t-[1px] border-black text-[11px]">
                    <div className="border-r-[2px] border-black p-0.5 pl-1">Branch</div>
                    <div></div>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_80px_120px] border-b-[2px] border-black text-sm">
                  <div className="border-r-[2px] border-black font-bold p-1 text-[12px] flex flex-col justify-center items-start pl-2">
                    <span className="underline">Amount in Words :</span>
                    <span className="font-normal text-[10px] leading-tight mt-1">-- {numberToWords(selectedBill.amount)} --</span>
                  </div>
                  <div className="border-r-[2px] border-black font-bold p-1 flex items-center justify-center text-[12px]">
                    Total
                  </div>
                  <div className="font-bold p-1 flex items-center justify-center text-[12px]">
                    {selectedBill.amount.toLocaleString('en-IN')}
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
        </Card>
      </div>
    )
  }

  if (showCreate) {
    return <NewVendorBill onCancel={() => setShowCreate(false)} />
  }

  return (
    <div className="flex-1 space-y-6 pb-8 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Vendor Bills List</h2>
            <p className="text-muted-foreground mt-1">
              Manage your accounts payable, verify bills, and track vendor payments.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Vendor Invoice
          </Button>
        </div>
      </div>





      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'pending' && 'Bills Pending Verification'}
            {activeTab === 'approved' && 'Approved Bills'}
            {activeTab === 'rejected' && 'Rejected Bills'}
            {activeTab === 'vendors' && 'All Vendors'}
          </CardTitle>
          <CardDescription>
            {activeTab === 'vendors' ? 'A directory of your registered vendors and their details.' : 'Review and manage your incoming vendor bills.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeTab === 'vendors' ? (
            <div className="py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <Building2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Vendor directory view will be implemented here.</p>
            </div>
          ) : (
            <DataTable columns={columns} data={filteredBills} />
          )}
        </CardContent>
      </Card>

      {/* Upload Modal (Dialog) */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowUpload(false)} />
          <Card className="relative z-50 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <div>
                <CardTitle>Upload Vendor Bill</CardTitle>
                <CardDescription>Drag and drop a PDF or scanned image of the bill.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowUpload(false)}>
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer">
                <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Click or drag Excel/PDF to upload</h3>
                <p className="text-sm text-muted-foreground mt-2">Upload vendor submitted bills directly.</p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium block text-center">Vendor hasn't submitted a bill?</label>
                <Button className="w-full" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Auto-Generate from Customer Billing Data
                </Button>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-4 border-t bg-muted/20 rounded-b-lg">
              <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
              <Button>Upload & Process</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
