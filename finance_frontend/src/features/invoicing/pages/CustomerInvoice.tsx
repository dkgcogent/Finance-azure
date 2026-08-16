import React, { useMemo, useState, useRef } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { usePermissions } from "@/hooks/usePermissions"
import { DataTable, SortableHeader } from "@/components/shared/DataTable"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Download,
  Plus,
  FileText,
  MoreHorizontal,
  X,
  Printer,
  CheckCircle2,
  Clock,
  Send,
  Ban,
  ArrowLeft,
  Loader2
} from "lucide-react"
import { useGlobalStore } from "@/store/useGlobalStore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCustomerInvoices, useCreateCustomerInvoice } from "../hooks/useCustomerInvoices"
import { Invoice } from "../api/customerInvoiceService"
import { InvoicePreviewTemplate } from "../components/InvoicePreviewTemplate"
// import { mockVendorBillsData } from "@/features/payables/pages/VendorBillsList"
import { useMasterData, useGenerateInvoiceReports } from "../hooks/useInvoiceReports"

export default function CustomerInvoice() {
  const [view, setView] = useState<"list" | "create">("list")
  const [createStep, setCreateStep] = useState<"details" | "mis" | "annexures" | "preview">("details")
  const [invoiceCustomer, setInvoiceCustomer] = useState("")
  const [invoiceLocation, setInvoiceLocation] = useState("")
  const [invoiceType, setInvoiceType] = useState("")
  const [invoiceProject, setInvoiceProject] = useState("")
  const [invoiceSubProject, setInvoiceSubProject] = useState("")
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reportData, setReportData] = useState<{ misData: any[], annexureData: any[], flipkartAnnexureData?: any[], flipkartAdhocAnnexureData?: any[], fallbackCustomerGSTIN?: string, fallbackCustomerAddress?: string } | null>(null)
  // Metadata fields
  const [workOrderNo, setWorkOrderNo] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [serviceProviderCode, setServiceProviderCode] = useState("")
  const [costCode, setCostCode] = useState("")

  const { customers, projects, locations, isLoading: isMasterLoading } = useMasterData()
  
  console.log("CustomerInvoice MasterData Debug:", { customers, projects, locations, isMasterLoading });

  // Derived: selected customer object
  const selectedCustomer = useMemo(() =>
    customers.find((c: any) => String(c.id) === String(invoiceCustomer)),
    [customers, invoiceCustomer]
  )
  const selectedProject = useMemo(() =>
    projects.find((p: any) => String(p.id) === String(invoiceProject)),
    [projects, invoiceProject]
  )

  // Ecosystem detection
  const ecosystem = useMemo(() => {
    const str = ((selectedCustomer?.name || '') + (selectedCustomer?.code || '')).toLowerCase()
    if (str.includes('rqs') || str.includes('qwik') || str.includes('reliance')) return 'reliance'
    if (str.includes('flip') || str.includes('instakart') || str.includes('instra')) return 'flipkart'
    return 'unknown'
  }, [selectedCustomer])

  // Smart date defaults by ecosystem
  const handleCustomerChange = (customerId: string) => {
    setInvoiceCustomer(customerId)
    setInvoiceProject("")
    setInvoiceSubProject("")
    setInvoiceLocation("")
    setInvoiceType("")
    setReportData(null)

    const cust = customers.find((c: any) => String(c.id) === customerId)
    const custStr = ((cust?.name || '') + (cust?.code || '')).toLowerCase()
    const today = new Date()

    if (custStr.includes('rqs') || custStr.includes('qwik') || custStr.includes('reliance')) {
      // Reliance: 25th prev month → 24th this month
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 25)
      const end = new Date(today.getFullYear(), today.getMonth(), 24)
      setStartDate(start.toISOString().slice(0, 10))
      setEndDate(end.toISOString().slice(0, 10))
    } else {
      // Flipkart / default: 1st → last day of this month
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      setStartDate(start.toISOString().slice(0, 10))
      setEndDate(end.toISOString().slice(0, 10))
    }
  }

  const filteredProjects = useMemo(() => {
    if (!invoiceCustomer) return [];
    return projects.filter((p: any) => p.customerId === parseInt(invoiceCustomer) || p.customerId === invoiceCustomer);
  }, [projects, invoiceCustomer]);

  const filteredLocations = useMemo(() => {
    if (!invoiceCustomer) return [];
    const locs = locations.filter((l: any) => l.customerId === parseInt(invoiceCustomer) || l.customerId === invoiceCustomer);
    const seenNames = new Set<string>();
    return locs.filter((l: any) => {
      const name = (l.name || '').trim();
      if (!name || seenNames.has(name)) return false;
      seenNames.add(name);
      return true;
    });
  }, [locations, invoiceCustomer]);

  const reportMutation = useGenerateInvoiceReports()

  const { canCreateInvoice } = usePermissions()
  const { financialYear, setFinancialYear } = useGlobalStore()
  const { data: invoices = [], isLoading } = useCustomerInvoices(financialYear)
  const createInvoiceMutation = useCreateCustomerInvoice(financialYear)
  const pdfRef = useRef<HTMLDivElement>(null)
  const annexurePdfRef = useRef<HTMLDivElement>(null)

  const handleDownloadAnnexurePDF = () => {
    if (!annexurePdfRef.current) return;

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
            <title>Annexure</title>
            ${stylesHtml}
            <style>
              body { background: white !important; margin: 0; padding: 0; font-family: sans-serif; }
              @media print {
                @page { size: A4 landscape; margin: 5mm; }
                body { padding: 5mm; margin: 0; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                table { page-break-inside: auto; }
                tr    { page-break-inside: avoid; page-break-after: auto; }
              }
            </style>
          </head>
          <body>
            <div style="width: 100%; margin: 0 auto; zoom: 0.75;">
              <h2 style="text-align: center; margin-bottom: 20px;">Annexure</h2>
              ${annexurePdfRef.current.innerHTML}
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
  }

  const handleAddInvoice = () => {
    // Calculate total freight from report data using the same logic as the preview template
    const totalFreight = (() => {
      if (!reportData) return 0;
      const fromFlipkart = (reportData.flipkartAnnexureData || []).reduce((sum: number, r: any) => {
        const v = parseFloat(r.amount || r.totalAmount || 0);
        return sum + (isNaN(v) ? 0 : v);
      }, 0);
      const fromFlipkartAdhoc = (reportData.flipkartAdhocAnnexureData || []).reduce((sum: number, r: any) => {
        const v = parseFloat(r.amount || r.totalAmount || 0);
        return sum + (isNaN(v) ? 0 : v);
      }, 0);
      const fromAnnexure = (reportData.annexureData || []).reduce((sum: number, r: any) => {
        const v = parseFloat(r.totalAmount || r.amount || r.totalFixCost || 0);
        return sum + (isNaN(v) ? 0 : v);
      }, 0);
      const fromMIS = (reportData.misData || []).reduce((sum: number, r: any) => {
        const v = parseFloat(r.FreightFix || r.TotalFreight || r.amount || 0);
        return sum + (isNaN(v) ? 0 : v);
      }, 0);
      return fromFlipkart || fromFlipkartAdhoc || fromAnnexure || fromMIS || 0;
    })();
    const totalTax = totalFreight * 0.18;
    const grandTotal = totalFreight + totalTax;

    const printArea = document.getElementById('invoice-print-area');
    const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    const stylesHtml = styleElements.map(el => el.outerHTML).join('\\n');

    const htmlPayload = printArea ? `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice</title>
          <script src="https://cdn.tailwindcss.com"></script>
          ${stylesHtml}
          <style>
            body { background: white !important; margin: 0; padding: 20px; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            table { page-break-inside: auto; }
            tr    { page-break-inside: avoid; page-break-after: auto; }
          </style>
        </head>
        <body>
          <div id="invoice-print-area">
            ${printArea.innerHTML}
          </div>
        </body>
      </html>
    ` : undefined;

    createInvoiceMutation.mutate({
      customerId: invoiceCustomer,
      options: {
        customerName: selectedCustomer?.name?.split(' (')[0] || invoiceCustomer,
        amount: grandTotal,
        financialYear,
        tripType: invoiceType,
        html: htmlPayload,
        invoiceDate
      }
    }, {
      onSuccess: () => {
        setView("list")
        setCreateStep("details")
        setInvoiceCustomer("")
        setInvoiceLocation("")
        setInvoiceType("")
        setInvoiceProject("")
        setInvoiceSubProject("")
        setWorkOrderNo("")
        setServiceProviderCode("")
        setCostCode("")
        setReportData(null)
        setInvoiceDate(new Date().toISOString().split('T')[0])
      }
    })
  }


  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: ({ column }) => <SortableHeader column={column} title="Invoice #" />,
        cell: ({ row }) => (
          <div
            className="flex items-center gap-2 font-medium text-primary cursor-pointer hover:underline"
            onClick={() => setSelectedInvoice(row.original)}
          >
            <FileText className="h-4 w-4" />
            {row.getValue("invoiceNumber")}
          </div>
        ),
      },
      {
        accessorKey: "customerName",
        header: ({ column }) => <SortableHeader column={column} title="Customer Name" />,
      },
      {
        accessorKey: "date",
        header: ({ column }) => <SortableHeader column={column} title="Date" />,
        cell: ({ row }) => {
          const dateStr = row.getValue("date") as string;
          const d = dateStr ? new Date(dateStr) : null;
          return <div>{d && !isNaN(d.getTime()) ? d.toLocaleDateString('en-GB') : '-'}</div>;
        }
      },
      {
        accessorKey: "dueDate",
        header: ({ column }) => <SortableHeader column={column} title="Due Date" />,
        cell: ({ row }) => {
          const status = row.getValue("status") as string
          const dateStr = row.getValue("dueDate") as string;
          const d = dateStr ? new Date(dateStr) : null;
          return (
            <div className={status === "Overdue" ? "text-destructive font-medium" : ""}>
              {d && !isNaN(d.getTime()) ? d.toLocaleDateString('en-GB') : '-'}
            </div>
          )
        }
      },
      {
        accessorKey: "amount",
        header: ({ column }) => <SortableHeader column={column} title="Amount" />,
        cell: ({ row }) => {
          const amount = parseFloat(row.getValue("amount"))
          return <div className="text-center font-medium">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount)}</div>

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
                status === "Paid" ? "success" :
                  status === "Overdue" ? "destructive" :
                    status === "Pending" ? "default" :
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
            <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(row.original)}>
              View
            </Button>

          </div>
        ),
      },
    ],
    []
  )

  const handleDownloadExcel = (type: "annexure" | "mis") => {
    let dataToExport: any[] = [];
    let keys: string[] = [];
    let labels: string[] = [];

    if (type === "mis") {
      dataToExport = reportData?.misData || [];
      keys = ["date", "consignorName", "vendor", "vehicle", "vehicleOwnership", "actualStart", "actualEnd", "transit", "total", "extra", "working", "startKm", "endKm", "distance", "extraKm", "orderNumber", "tripLogNumber"];
      labels = ["Date", "Consignor Name", "Vendor", "Vehicle No.", "Vehicle Ownership", "Actual Start", "Actual End", "Transit Time", "Total Hrs", "Extra Hrs", "Working Hours", "Start Odometer", "End Odometer", "Distance", "Extra Km", "Order Number", "Trip Log Number"];
    } else if (type === "annexure") {
      if (reportData?.flipkartAnnexureData && reportData.flipkartAnnexureData.length > 0) {
        dataToExport = reportData.flipkartAnnexureData;
        keys = ["sNo", "vehicleNo", "typeOfVehicle", "mode", "location", "vertical", "noOfHours", "fixedKms", "agreementRate", "dieselHike", "totalChargesWithDieselHike", "workingDaysToBeDone", "daysActualDone", "totalKMs", "extraHourRate", "extraHour", "extraHourCharges", "extraKmRate", "extraKm", "extraKmCharge", "totalAmount", "perDayCost", "tWorkingDaysAmount", "tollCharges", "amount"];
        labels = ["S. No.", "Vehicle No", "Type of Vehicle", "Mode", "Location", "Vertical", "No. of hours", "Fixed Kms", "Agreement Rate", "Diesel Hike", "Total Charges with Diesel Hike", "Nos. Of Working days to be done", "Nos. of days actual done", "Total KMs", "Extra Hour Amount", "Extra Hour", "Extra Hour Charges", "Extra KM rate", "Extra Km", "Extra Km Charge", "Total Amount", "Per Day Cost", "T. Working days Amount", "Toll charges", "Amount"];
      } else if (reportData?.flipkartAdhocAnnexureData && reportData.flipkartAdhocAnnexureData.length > 0) {
        dataToExport = reportData.flipkartAdhocAnnexureData;
        keys = ["sNo", "location", "noOfTrips", "fixRate", "extraKm", "extraKmRate", "totalFixCost", "extraKmCharge", "handlingCharges", "amount"];
        labels = ["S. No.", "Location", "No Of Trips", "Fix Rate", "Extra KM", "Extra KM Rate", "Total Fix Cost", "Extra KM Charge", "Handling Charges", "Total"];
      } else {
        dataToExport = reportData?.annexureData || [];
        keys = ["location", "noOfTrips", "rates", "extraKm", "extraKmRates", "extraHrs", "extraHrsRates", "totalFixCost", "extraKmCost", "extraHrsCost", "handling", "amount"];
        labels = ["Location", "No. of Trips", "Rates", "Extra KM", "Extra KM Rates", "Extra Hrs", "Extra Hrs Rates", "Total Fix Cost", "Extra KM Cost", "Extra Hrs Cost", "Handling", "Amount"];
      }
    }

    if (!dataToExport.length) return;

    const formatForExcel = (val: any, key: string) => {
      if (val === null || val === undefined) return '';
      let strVal = val.toString();
      
      // Force text rendering in Excel to prevent scientific notation or ######## width issues
      if (key === 'date' || key === 'actualStart' || key === 'actualEnd' || key === 'vehicle' || key === 'vehicleNo' || key === 'orderNumber' || key === 'tripLogNumber') {
        strVal = ` ${strVal}`;
      }
      return strVal.replace(/"/g, '""');
    };

    const csvContent = [
      labels.map(l => `"${l}"`).join(","),
      ...dataToExport.map((row: any) => keys.map(k => {
        let val = row[k];
        if (type === "annexure" && (!reportData?.flipkartAnnexureData && !reportData?.flipkartAdhocAnnexureData)) {
          if (k === 'rates') val = row.rates ?? row.fixRate ?? row.agreementRate ?? 0;
          if (k === 'extraKmRates') val = row.extraKmRates ?? row.extraKmRate ?? 0;
          if (k === 'extraHrs') val = row.extraHrs ?? row.extraHour ?? 0;
          if (k === 'extraHrsRates') val = row.extraHrsRates ?? row.extraHrsRate ?? 0;
          if (k === 'totalFixCost') val = row.totalFixCost ?? row.amount ?? 0;
          if (k === 'extraKmCost') val = row.extraKmCost ?? row.extraKmCharge ?? row.extraKmChar ?? 0;
          if (k === 'extraHrsCost') val = row.extraHrsCost ?? row.extraHrsChar ?? 0;
          if (k === 'handling') val = row.handling ?? row.handlingCharges ?? 0;
          if (k === 'amount') val = row.totalAmount ?? row.amount ?? 0;
        }
        return `"${formatForExcel(val, k)}"`;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Customer_Invoice_${type}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  const handleDownloadPDF = () => {
    const printArea = document.getElementById('invoice-print-area');
    if (!printArea) return;

    // Gather existing stylesheets (Tailwind, etc.)
    const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    const stylesHtml = styleElements.map(el => el.outerHTML).join('\\n');

    // Create an invisible iframe
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
            <title>Invoice</title>
            <script src="https://cdn.tailwindcss.com"></script>
            ${stylesHtml}
            <style>
              body { background: white !important; margin: 0; padding: 20px; }
              @media print {
                @page { size: A4 portrait; margin: 5mm; }
                body { padding: 0; margin: 0; }
                /* Force perfect rendering and avoid breaks */
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                table { page-break-inside: auto; }
                tr    { page-break-inside: avoid; page-break-after: auto; }
              }
            </style>
          </head>
          <body>
            <div id="invoice-print-area">
              ${printArea.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      iframe.contentWindow?.focus();

      // Trigger print after styles have a moment to apply
      setTimeout(() => {
        iframe.contentWindow?.print();
      }, 800);

      // Clean up iframe after print dialog is closed
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 10000);
    }
  }

  const renderTimeline = (status: string) => {
    const steps = [
      { label: "Draft Created", icon: FileText, done: true },
      { label: "Approved", icon: CheckCircle2, done: status !== "Draft" },
      { label: "Sent to Customer", icon: Send, done: status !== "Draft" },
      { label: "Payment Received", icon: Clock, done: status === "Paid", isLast: true }
    ]

    return (
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">Invoice Timeline</h4>
        <div className="relative border-l border-muted-foreground/20 ml-3 space-y-6 pb-4">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className="relative pl-6">
                <div className={`absolute -left-[11px] top-1 p-1 rounded-full bg-background border ${step.done ? 'border-primary text-primary' : 'border-muted text-muted-foreground'}`}>
                  <Icon className="h-3 w-3" />
                </div>
                <div>
                  <p className={`text-sm font-medium ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                </div>
              </div>
            )
          })}
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
            <h2 className="text-3xl font-bold tracking-tight">Customer Invoices</h2>
            <p className="text-muted-foreground mt-1">
              Manage your accounts receivable and issue new invoices.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={financialYear} onValueChange={(val) => setFinancialYear(val || "")}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="Financial Year" />
              </SelectTrigger>
              <SelectContent>
                {["2025-2026", "2026-2027", "2027-2028"].map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canCreateInvoice && (
              <Button size="sm" onClick={() => setView("create")} disabled={createInvoiceMutation.isPending}>
                {createInvoiceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create Invoice
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => {
              setView("list")
              setCreateStep("details")
            }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Create Invoice</h2>
              <p className="text-muted-foreground mt-1">
                Draft a new invoice to send to a customer.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium bg-muted/50 px-4 py-2 rounded-full">
            <span className={createStep === "details" ? "text-primary font-bold" : "text-muted-foreground"}>Creating</span>
            <span className="text-muted-foreground">→</span>
            <span className={createStep === "mis" ? "text-primary font-bold" : "text-muted-foreground"}>MIS</span>
            <span className="text-muted-foreground">→</span>
            <span className={createStep === "annexures" ? "text-primary font-bold" : "text-muted-foreground"}>Annexures</span>
            <span className="text-muted-foreground">→</span>
            <span className={createStep === "preview" ? "text-primary font-bold" : "text-muted-foreground"}>Preview</span>
          </div>
        </div>
      )}

      {view === "list" ? (
        <>


          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>A list of recent invoices generated for your customers.</CardDescription>
            </CardHeader>
            <CardContent className="relative min-h-[300px]">
              {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              )}
              <DataTable columns={columns} data={invoices} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>

          <CardContent className="space-y-6">
            {createStep === "details" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer</label>
                  <select
                    value={invoiceCustomer}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    disabled={isMasterLoading}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select a customer...</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project</label>
                  <select
                    value={invoiceProject}
                    onChange={(e) => {
                      setInvoiceProject(e.target.value);
                      setInvoiceSubProject("");
                      setInvoiceLocation("");
                      setInvoiceType("");
                    }}
                    disabled={!invoiceCustomer || isMasterLoading}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select a project...</option>
                    {filteredProjects.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <select
                    value={invoiceLocation}
                    onChange={(e) => {
                      setInvoiceLocation(e.target.value);
                      setInvoiceType("");
                    }}
                    disabled={!invoiceProject || isMasterLoading}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select a location...</option>
                    {filteredLocations.map((l: any) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value)}
                    disabled={!invoiceLocation}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select type...</option>
                    <option value="Fixed">Fixed</option>
                    <option value="Adhoc">Adhoc</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Period</label>
                  <div className="flex items-center gap-2">
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <span className="text-muted-foreground text-sm font-medium">to</span>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Invoice Date</label>
                  <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cost Code</label>
                  <Input placeholder="e.g. 4462" value={costCode} onChange={e => setCostCode(e.target.value)} />
                </div>

                {/* Ecosystem-specific metadata fields */}
                {ecosystem === 'reliance' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Work Order No <span className="text-xs text-muted-foreground">(Reliance)</span></label>
                      <Input placeholder="e.g. 5500115050" value={workOrderNo} onChange={e => setWorkOrderNo(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Service Provider Code <span className="text-xs text-muted-foreground">(Reliance)</span></label>
                      <Input placeholder="e.g. 10145861" value={serviceProviderCode} onChange={e => setServiceProviderCode(e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            )}
            {createStep === "mis" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">MIS Report</h3>
                    <p className="text-sm text-muted-foreground">Raw trip data from the selected parameters.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownloadExcel("mis")}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Excel
                    </Button>
                  </div>
                </div>
                <div className="border rounded-md overflow-x-auto pb-4">
                  <table className="w-full text-xs text-center border-collapse whitespace-nowrap min-w-max">
                    <thead className="bg-[#e2efd9] border-b border-black">
                      <tr>
                        <th className="p-2 border border-black font-bold">Date</th>
                        <th className="p-2 border border-black font-bold">Consignor Name</th>
                        <th className="p-2 border border-black font-bold">Vendor</th>
                        <th className="p-2 border border-black font-bold">Vehicle No.</th>
                        <th className="p-2 border border-black font-bold">Vehicle Ownership</th>
                        <th className="p-2 border border-black font-bold">Actual Start</th>
                        <th className="p-2 border border-black font-bold">Actual End</th>
                        <th className="p-2 border border-black font-bold">Transit Time</th>
                        <th className="p-2 border border-black font-bold">Total Hrs</th>
                        <th className="p-2 border border-black font-bold">Extra Hrs</th>
                        <th className="p-2 border border-black font-bold">Working Hours</th>
                        <th className="p-2 border border-black font-bold">Start Odometer</th>
                        <th className="p-2 border border-black font-bold">End Odometer</th>
                        <th className="p-2 border border-black font-bold">Distance</th>
                        <th className="p-2 border border-black font-bold">Extra Km</th>
                        <th className="p-2 border border-black font-bold">Order Number</th>
                        <th className="p-2 border border-black font-bold">Trip Log Number</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData?.misData?.map((row: any, i: number) => (
                        <tr key={i}>
                          <td className="p-1 border border-black bg-white">{new Date(row.date).toLocaleDateString()}</td>
                          <td className="p-1 border border-black bg-white">{row.consignorName || '—'}</td>
                          <td className="p-1 border border-black bg-white">{row.vendor || '—'}</td>
                          <td className="p-1 border border-black bg-white">{row.vehicle || '—'}</td>
                          <td className="p-1 border border-black bg-white">{row.vehicleOwnership || '—'}</td>
                          <td className="p-1 border border-black bg-white">{row.actualStart || '—'}</td>
                          <td className="p-1 border border-black bg-white">{row.actualEnd || '—'}</td>
                          <td className="p-1 border border-black bg-white">{Math.round(Number(row.transit || 0))}</td>
                          <td className="p-1 border border-black bg-white">{row.total ?? 0}</td>
                          <td className="p-1 border border-black bg-white">{row.extra ?? 0}</td>
                          <td className="p-1 border border-black bg-white">{row.working ?? 0}</td>
                          <td className="p-1 border border-black bg-white">{row.startKm ?? 0}</td>
                          <td className="p-1 border border-black bg-white">{row.endKm ?? 0}</td>
                          <td className="p-1 border border-black bg-white">{row.distance ?? 0}</td>
                          <td className="p-1 border border-black bg-white">{row.extraKm ?? 0}</td>
                          <td className="p-1 border border-black bg-white">{row.orderNumber || '—'}</td>
                          <td className="p-1 border border-black bg-white">{row.tripLogNumber || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {createStep === "annexures" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Annexure Details</h3>
                    <p className="text-sm text-muted-foreground">Generated based on the selected invoice parameters.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownloadAnnexurePDF()}>
                      <FileText className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadExcel("annexure")}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Excel
                    </Button>
                  </div>
                </div>
                <div className="border rounded-md overflow-x-auto pb-4" ref={annexurePdfRef}>
                  {reportData?.flipkartAnnexureData && reportData.flipkartAnnexureData.length > 0 ? (
                    <table className="w-full text-xs text-center border-collapse whitespace-nowrap min-w-max">
                      <thead className="bg-[#b3d4f0] border-b border-black">
                        <tr>
                          <th className="p-2 border border-black font-bold">S. No.</th>
                          <th className="p-2 border border-black font-bold">Vehicle No</th>
                          <th className="p-2 border border-black font-bold">Type of Vehicle</th>
                          <th className="p-2 border border-black font-bold">Mode</th>
                          <th className="p-2 border border-black font-bold">Location</th>
                          <th className="p-2 border border-black font-bold">Vertical</th>
                          <th className="p-2 border border-black font-bold">No. of hours</th>
                          <th className="p-2 border border-black font-bold">Fixed Kms (31 Days)</th>
                          <th className="p-2 border border-black font-bold">Agreement Rate</th>
                          <th className="p-2 border border-black font-bold">Diesel Hike</th>
                          <th className="p-2 border border-black font-bold">Total Charges with Diesel Hike</th>
                          <th className="p-2 border border-black font-bold">Nos. Of Working days to be done</th>
                          <th className="p-2 border border-black font-bold">Nos. of days actual done</th>
                          <th className="p-2 border border-black font-bold">Total KMs</th>
                          <th className="p-2 border border-black font-bold">Extra Hour Amount</th>
                          <th className="p-2 border border-black font-bold">Extra Hour</th>
                          <th className="p-2 border border-black font-bold">Extra Hour Charges</th>
                          <th className="p-2 border border-black font-bold">Extra KM rate</th>
                          <th className="p-2 border border-black font-bold">Extra Km</th>
                          <th className="p-2 border border-black font-bold">Extra Km Charge</th>
                          <th className="p-2 border border-black font-bold">Total Amount</th>
                          <th className="p-2 border border-black font-bold">Per Day Cost</th>
                          <th className="p-2 border border-black font-bold">T. Working days Amount</th>
                          <th className="p-2 border border-black font-bold">Toll charges (Parking & Toll)</th>
                          <th className="p-2 border border-black font-bold">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.flipkartAnnexureData.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="p-2 border border-black bg-white">{row.sNo}</td>
                            <td className="p-2 border border-black bg-white">{row.vehicleNo}</td>
                            <td className="p-2 border border-black bg-white">{row.typeOfVehicle}</td>
                            <td className="p-2 border border-black bg-white">{row.mode}</td>
                            <td className="p-2 border border-black bg-white">{row.location}</td>
                            <td className="p-2 border border-black bg-white">{row.vertical}</td>
                            <td className="p-2 border border-black bg-white">{row.noOfHours}</td>
                            <td className="p-2 border border-black bg-white">{row.fixedKms}</td>
                            <td className="p-2 border border-black bg-white">{row.agreementRate}</td>
                            <td className="p-2 border border-black bg-white">{row.dieselHike}</td>
                            <td className="p-2 border border-black bg-white">{row.totalChargesWithDieselHike}</td>
                            <td className="p-2 border border-black bg-white">{row.workingDaysToBeDone}</td>
                            <td className="p-2 border border-black bg-white">{row.daysActualDone}</td>
                            <td className="p-2 border border-black bg-white">{row.totalKMs}</td>
                            <td className="p-2 border border-black bg-white">{row.extraHourRate}</td>
                            <td className="p-2 border border-black bg-white">{row.extraHour}</td>
                            <td className="p-2 border border-black bg-white">{row.extraHourCharges}</td>
                            <td className="p-2 border border-black bg-white">{row.extraKmRate}</td>
                            <td className="p-2 border border-black bg-white">{row.extraKm}</td>
                            <td className="p-2 border border-black bg-white">{row.extraKmCharge}</td>
                            <td className="p-2 border border-black bg-white">{row.totalAmount}</td>
                            <td className="p-2 border border-black bg-white">{row.perDayCost}</td>
                            <td className="p-2 border border-black bg-white">{row.tWorkingDaysAmount}</td>
                            <td className="p-2 border border-black bg-white">{row.tollCharges}</td>
                            <td className="p-2 border border-black bg-white font-medium">{row.amount}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={24} className="p-2 border border-black bg-[#e2efd9] font-bold text-right pr-4">Grand Total</td>
                          <td className="p-2 border border-black bg-[#e2efd9] font-bold">{reportData.flipkartAnnexureData.reduce((acc: number, r: any) => acc + (parseFloat(r.amount || 0)), 0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : reportData?.flipkartAdhocAnnexureData && reportData.flipkartAdhocAnnexureData.length > 0 ? (
                    <table className="w-full text-xs text-center border-collapse whitespace-nowrap min-w-max">
                      <thead className="bg-[#b3d4f0] border-b border-black">
                        <tr>
                          <th className="p-2 border border-black font-bold">S. No.</th>
                          <th className="p-2 border border-black font-bold">Location</th>
                          <th className="p-2 border border-black font-bold">No Of Trips</th>
                          <th className="p-2 border border-black font-bold">Fix Rate</th>
                          <th className="p-2 border border-black font-bold">Extra KM</th>
                          <th className="p-2 border border-black font-bold">Extra KM Rate</th>
                          <th className="p-2 border border-black font-bold">Total Fix Cost</th>
                          <th className="p-2 border border-black font-bold">Extra KM Charge</th>
                          <th className="p-2 border border-black font-bold">Handling Charges</th>
                          <th className="p-2 border border-black font-bold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.flipkartAdhocAnnexureData.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="p-2 border border-black bg-white">{row.sNo}</td>
                            <td className="p-2 border border-black bg-white">{row.location}</td>
                            <td className="p-2 border border-black bg-white">{row.noOfTrips}</td>
                            <td className="p-2 border border-black bg-white">{row.fixRate}</td>
                            <td className="p-2 border border-black bg-white">{row.extraKm}</td>
                            <td className="p-2 border border-black bg-white">{row.extraKmRate}</td>
                            <td className="p-2 border border-black bg-white">{row.totalFixCost}</td>
                            <td className="p-2 border border-black bg-white">{row.extraKmCharge}</td>
                            <td className="p-2 border border-black bg-white">{row.handlingCharges}</td>
                            <td className="p-2 border border-black bg-white font-medium">{row.amount}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={9} className="p-2 border border-black bg-[#e2efd9] font-bold text-right pr-4">Total</td>
                          <td className="p-2 border border-black bg-[#e2efd9] font-bold">{reportData.flipkartAdhocAnnexureData.reduce((acc: number, r: any) => acc + (parseFloat(r.amount || 0)), 0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-xs text-center border-collapse whitespace-nowrap min-w-max">
                      <thead className="bg-[#b3d4f0] border-b border-black">
                        <tr>
                          <th className="p-2 border border-black font-bold">Location</th>
                          <th className="p-2 border border-black font-bold">No. of Trips</th>
                          <th className="p-2 border border-black font-bold">Rates</th>
                          <th className="p-2 border border-black font-bold">Extra KM</th>
                          <th className="p-2 border border-black font-bold">Extra KM Rates</th>
                          <th className="p-2 border border-black font-bold">Extra Hrs</th>
                          <th className="p-2 border border-black font-bold">Extra Hrs Rates</th>
                          <th className="p-2 border border-black font-bold">Total Fix Cost</th>
                          <th className="p-2 border border-black font-bold">Extra KM Cost</th>
                          <th className="p-2 border border-black font-bold">Extra Hrs Cost</th>
                          <th className="p-2 border border-black font-bold">Handling</th>
                          <th className="p-2 border border-black font-bold">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData?.annexureData?.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="p-2 border border-black bg-white">{row.location}</td>
                            <td className="p-2 border border-black bg-white">{row.noOfTrips}</td>
                            <td className="p-2 border border-black bg-white">{row.rates ?? row.fixRate ?? row.agreementRate ?? 0}</td>
                            <td className="p-2 border border-black bg-white">{row.extraKm ?? 0}</td>
                            <td className="p-2 border border-black bg-white">{row.extraKmRates ?? row.extraKmRate ?? 0}</td>
                            <td className="p-2 border border-black bg-white">{row.extraHrs ?? row.extraHour ?? 0}</td>
                            <td className="p-2 border border-black bg-white">{row.extraHrsRates ?? row.extraHrsRate ?? 0}</td>
                            <td className="p-2 border border-black bg-white">{row.totalFixCost ?? row.amount ?? 0}</td>
                            <td className="p-2 border border-black bg-white">{row.extraKmCost ?? row.extraKmCharge ?? row.extraKmChar ?? 0}</td>
                            <td className="p-2 border border-black bg-white">{row.extraHrsCost ?? row.extraHrsChar ?? 0}</td>
                            <td className="p-2 border border-black bg-white">{row.handling ?? row.handlingCharges ?? 0}</td>
                            <td className="p-2 border border-black bg-white font-medium">{row.totalAmount ?? row.amount ?? 0}</td>
                          </tr>
                        ))}
                        {(!reportData?.annexureData || reportData.annexureData.length === 0) && (
                          <tr>
                            <td colSpan={12} className="p-4 border border-black bg-white text-center text-muted-foreground">
                              No annexure data available.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}


            {createStep === "preview" && (
              <div id="invoice-print-area">
                <InvoicePreviewTemplate
                  customerName={selectedCustomer?.name}
                  customerCode={selectedCustomer?.code}
                  projectName={selectedProject?.name}
                  invoiceLocation={invoiceLocation}
                  invoiceType={invoiceType}
                  startDate={startDate}
                  endDate={endDate}
                  invoiceDate={invoiceDate}
                  reportData={reportData}
                  workOrderNo={workOrderNo}
                  serviceProviderCode={serviceProviderCode}
                  costCode={costCode}
                />
              </div>
            )}

            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  if (createStep === "preview") setCreateStep("annexures")
                  else if (createStep === "annexures") setCreateStep("mis")
                  else if (createStep === "mis") setCreateStep("details")
                  else {
                    setView("list")
                    setCreateStep("details")
                  }
                }}
              >
                {createStep === "preview" ? "Cancel" : "Prev"}
              </Button>
              <div className="flex gap-2">
                {createStep === "preview" && (
                  <Button variant="outline" onClick={() => handleDownloadPDF()}>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                )}
                <Button
                  variant="default"
                  disabled={reportMutation.isPending || createInvoiceMutation.isPending}
                  onClick={() => {
                    if (createStep === "details") {
                      reportMutation.mutate({
                        customerId: Number(invoiceCustomer),
                        projectId: Number(invoiceProject),
                        locationId: invoiceLocation,
                        tripType: invoiceType,
                        startDate,
                        endDate
                      }, {
                        onSuccess: (data) => {
                          setReportData(data);
                          setCreateStep("mis");
                        }
                      });
                    }
                    else if (createStep === "mis") setCreateStep("annexures")
                    else if (createStep === "annexures") setCreateStep("preview")
                    else if (createStep === "preview") {
                      handleAddInvoice()
                    }
                  }}
                >
                  {(reportMutation.isPending || createInvoiceMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {createInvoiceMutation.isPending
                    ? "Saving Invoice..."
                    : reportMutation.isPending
                    ? "Generating..."
                    : createStep === "preview"
                    ? "Proceed"
                    : createStep === "annexures"
                    ? "Submit"
                    : "Next"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Details Full Screen View */}
      {selectedInvoice && (
        <div className="fixed inset-0 w-full h-full bg-background/95 backdrop-blur-sm z-50 overflow-y-auto animate-in fade-in duration-200">
          <div className="min-h-full flex flex-col bg-background">
            <div className="flex items-center justify-between p-4 border-b bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold">{selectedInvoice.invoiceNumber}</h3>
                <Badge variant={selectedInvoice.status === "Paid" ? "success" : selectedInvoice.status === "Overdue" ? "destructive" : "secondary"}>
                  {selectedInvoice.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedInvoice.azureBlobUrl) {
                      window.open(selectedInvoice.azureBlobUrl, '_blank');
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSelectedInvoice(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-8">
              <div className="bg-white rounded-lg border shadow-sm overflow-hidden h-[800px]">
                {selectedInvoice.azureBlobUrl ? (
                  <iframe
                    src={selectedInvoice.azureBlobUrl}
                    className="w-full h-full"
                    title="Invoice PDF"
                  />
                ) : (
                  <div id="invoice-print-area">
                    <InvoicePreviewTemplate
                      customerName={selectedInvoice.customerName}
                      invoiceType={selectedInvoice.format?.toLowerCase().includes('adhoc') ? 'Adhoc' : 'Fixed'}
                      startDate={selectedInvoice.date}
                      endDate={selectedInvoice.dueDate}
                      invoiceDate={selectedInvoice.date}
                      reportData={null}
                    />
                  </div>
                )}
              </div>

              {/* Quick Actions below the invoice removed per user request */}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
