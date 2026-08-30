import React, { useMemo, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import * as XLSX from "xlsx"
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
  Loader2,
  AlertCircle
} from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { numberToWords } from "@/lib/utils"
import { generateInvoiceExcel } from "../utils/generateInvoiceExcel"
import { exportTableToExcel } from "@/lib/excelExportHelper"
import cogentesLogoUrl from "@/assets/cogentes-logo.png"
import { useGlobalStore } from "@/store/useGlobalStore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCustomerInvoices, useCreateCustomerInvoice } from "../hooks/useCustomerInvoices"
import { Invoice } from "../api/customerInvoiceService"
import { InvoicePreviewTemplate } from "../components/InvoicePreviewTemplate"
// import { mockVendorBillsData } from "@/features/payables/pages/VendorBillsList"
import { useMasterData, useGenerateInvoiceReports } from "../hooks/useInvoiceReports"

export default function CustomerInvoice() {
  const navigate = useNavigate()
  const [view, setView] = useState<"list" | "create">("list")
  const [createStep, setCreateStep] = useState<"details" | "cards" | "mis" | "annexures" | "preview">("details")
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
  const [previewInvoiceNumber, setPreviewInvoiceNumber] = useState("")
  const [noDataModalOpen, setNoDataModalOpen] = useState(false)

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

  const dynamicSubtitle = useMemo(() => {
    const cust = selectedCustomer?.name?.split(' (')[0] || selectedCustomer?.name;
    const proj = selectedProject?.name;
    const loc = invoiceLocation;

    if (cust && proj && loc) {
      return `For the ${cust} of ${proj} Project in ${loc}`;
    } else if (cust && proj) {
      return `For the ${cust} of ${proj} Project`;
    } else if (cust && loc) {
      return `For the ${cust} in ${loc}`;
    } else if (cust) {
      return `For ${cust}`;
    }
    return "Draft a new invoice to send to a customer.";
  }, [selectedCustomer, selectedProject, invoiceLocation]);

  const reportPeriodSubtitle = useMemo(() => {
    const formatD = (d?: string) => {
      if (!d) return '';
      const parts = d.split('-');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      return d;
    };
    const range = (startDate && endDate) ? `${formatD(startDate)} to ${formatD(endDate)}` : '';
    const typeStr = invoiceType ? `${invoiceType} Type` : '';

    if (range && typeStr) {
      return `Period: ${range} (${typeStr})`;
    } else if (range) {
      return `Period: ${range}`;
    } else if (typeStr) {
      return typeStr;
    }
    return '';
  }, [startDate, endDate, invoiceType]);

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
    const result: any[] = [];

    locs.forEach((l: any) => {
      const rawName = (l.name || l.Location || '').trim();
      if (!rawName) return;

      const parts = rawName.split(',').map((p: string) => p.trim()).filter(Boolean);
      parts.forEach((part: string) => {
        if (!seenNames.has(part)) {
          seenNames.add(part);
          result.push({ id: part, name: part, customerId: l.customerId });
        }
      });
    });

    return result;
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

    const selectedProjectName = selectedProject?.name || 
      projects.find((p: any) => String(p.id) === String(invoiceProject) || p.name === invoiceProject)?.name ||
      reportData?.misData?.[0]?.projectName ||
      (typeof invoiceProject === 'string' ? invoiceProject : "");

    const selectedLocationName = locations.find((l: any) => String(l.id) === String(invoiceLocation) || l.name === invoiceLocation)?.name ||
      reportData?.misData?.[0]?.consignorName ||
      reportData?.misData?.[0]?.ourBranch ||
      reportData?.misData?.[0]?.ourState ||
      (typeof invoiceLocation === 'string' ? invoiceLocation : "");

    const projectWorkValue = invoiceSubProject || 
      (selectedProjectName && selectedLocationName ? `${selectedProjectName} ${selectedLocationName}` : (invoiceType ? `${selectedProjectName} ${invoiceType}` : selectedProjectName));

    const dbGSTNo = reportData?.misData?.find((row: any) => row.GSTNo)?.GSTNo || 
      reportData?.fallbackCustomerGSTIN || 
      (selectedCustomer as any)?.gstNo || 
      (selectedCustomer as any)?.gstin || 
      (selectedCustomer as any)?.GSTNo || 
      "";

    createInvoiceMutation.mutate({
      customerId: invoiceCustomer,
      options: {
        customerName: selectedCustomer?.name?.split(' (')[0] || invoiceCustomer,
        amount: totalFreight,
        subtotal: totalFreight,
        igst: totalTax,
        grandTotal: grandTotal,
        custGst: dbGSTNo,
        financialYear,
        tripType: invoiceType,
        html: htmlPayload,
        invoiceDate,
        project: selectedProjectName,
        projectWork: projectWorkValue,
        location: selectedLocationName,
        hsn: "996511",
        preGeneratedInvoiceNumber: previewInvoiceNumber || undefined
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

  const handleDownloadExcel = async (type: "annexure" | "mis") => {
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

    const formattedData = dataToExport.map((row: any) =>
      keys.map((k) => {
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
        if (k === 'date' && val) {
          return new Date(val).toLocaleDateString('en-GB');
        }
        if (k === 'transit') {
          return Math.round(Number(val || 0));
        }
        return val ?? '';
      })
    );

    await exportTableToExcel({
      sheetName: type === "mis" ? "MIS" : "Annexure",
      headers: labels,
      data: formattedData,
      fileName: `Customer_Invoice_${type === "mis" ? "MIS" : "Annexure"}.xlsx`,
    });
  }
  const handleDownloadPDF = () => {
    const printArea = document.getElementById('invoice-print-area') || document.getElementById('invoice-print-area-hidden');
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

  const handleDownloadAll = async () => {
    if (!reportData) return;

    const fy = financialYear || '2025-2026';
    const parts = fy.split('-');
    const shortYear = parts.length >= 2 ? `${parts[0].slice(-2)}-${parts[1].slice(-2)}` : '25-26';
    const invNo = previewInvoiceNumber || `CLPL/${shortYear}/---`;

    // ── Calculate Freight ────────────────────────────────────────────────────
    let totalFreight = 0;
    if (reportData.flipkartAnnexureData && reportData.flipkartAnnexureData.length > 0) {
      totalFreight = reportData.flipkartAnnexureData.reduce((s: number, r: any) => s + (parseFloat(r.amount || 0) || 0), 0);
    } else if (reportData.flipkartAdhocAnnexureData && reportData.flipkartAdhocAnnexureData.length > 0) {
      totalFreight = reportData.flipkartAdhocAnnexureData.reduce((s: number, r: any) => s + (parseFloat(r.amount || 0) || 0), 0);
    } else if (reportData.annexureData && reportData.annexureData.length > 0) {
      totalFreight = reportData.annexureData.reduce((s: number, r: any) => s + (parseFloat(r.totalAmount || r.amount || 0) || 0), 0);
    } else if (reportData.misData && reportData.misData.length > 0) {
      totalFreight = reportData.misData.reduce((s: number, r: any) => s + (parseFloat(r.FreightFix || r.amount || 0) || 0), 0);
    }

    const isInterState = invoiceLocation?.toLowerCase().includes('uttar') || invoiceLocation?.toLowerCase().includes('up');
    const dbGSTNo = reportData?.misData?.find((row: any) => row.GSTNo)?.GSTNo || reportData?.fallbackCustomerGSTIN;
    const customerGSTIN = dbGSTNo || '—';

    // ── Fetch cogentes logo ───────────────────────────────────────────────────
    let logoBuffer: ArrayBuffer | undefined;
    try {
      const logoResp = await fetch(cogentesLogoUrl);
      if (logoResp.ok) logoBuffer = await logoResp.arrayBuffer();
    } catch { /* logo is optional, falls back to text */ }

    // ── Build Annexure rows ───────────────────────────────────────────────────
    let annexureRows: any[][] = [];
    if (reportData.flipkartAnnexureData && reportData.flipkartAnnexureData.length > 0) {
      annexureRows = [
        ["S. No.", "Vehicle No", "Type of Vehicle", "Mode", "Location", "Vertical", "No. of hours", "Fixed Kms (31 Days)", "Agreement Rate", "Diesel Hike", "Total Charges with Diesel Hike", "Nos. Of Working days to be done", "Nos. of days actual done", "Total KMs", "Extra Hour Amount", "Extra Hour", "Extra Hour Charges", "Extra KM rate", "Extra Km", "Extra Km Charge", "Total Amount", "Per Day Cost", "T. Working days Amount", "Toll charges", "Amount"],
        ...reportData.flipkartAnnexureData.map((r: any, i: number) => [
          i + 1, r.vehicleNo, r.typeOfVehicle, r.mode, r.location, r.vertical, r.noOfHours, r.fixedKms, r.agreementRate, r.dieselHike, r.totalChargesWithDieselHike, r.workingDaysToBeDone, r.daysActualDone, r.totalKMs, r.extraHourRate, r.extraHour, r.extraHourCharges, r.extraKmRate, r.extraKm, r.extraKmCharge, r.totalAmount, r.perDayCost, r.tWorkingDaysAmount, r.tollCharges, r.amount
        ])
      ];
    } else if (reportData.flipkartAdhocAnnexureData && reportData.flipkartAdhocAnnexureData.length > 0) {
      annexureRows = [
        ["S. No.", "Location", "No Of Trips", "Fix Rate", "Extra KM", "Extra KM Rate", "Total Fix Cost", "Extra KM Charge", "Handling Charges", "Total"],
        ...reportData.flipkartAdhocAnnexureData.map((r: any, i: number) => [
          i + 1, r.location, r.noOfTrips, r.fixRate, r.extraKm, r.extraKmRate, r.totalFixCost, r.extraKmCharge, r.handlingCharges, r.amount
        ])
      ];
    } else if (reportData.annexureData && reportData.annexureData.length > 0) {
      annexureRows = [
        ["Location", "No. of Trips", "Rates", "Extra KM", "Extra KM Rates", "Extra Hrs", "Extra Hrs Rates", "Total Fix Cost", "Extra KM Cost", "Extra Hrs Cost", "Handling", "Amount"],
        ...reportData.annexureData.map((r: any) => [
          r.location, r.noOfTrips, r.rates ?? r.fixRate ?? r.agreementRate ?? 0, r.extraKm, r.extraKmRates ?? r.extraKmRate ?? 0, r.extraHrs ?? r.extraHour ?? 0, r.extraHrsRates ?? r.extraHrsRate ?? 0, r.totalFixCost ?? r.amount ?? 0, r.extraKmCost ?? r.extraKmCharge ?? 0, r.extraHrsCost ?? r.extraHrsChar ?? 0, r.handling ?? r.handlingCharges ?? 0, r.totalAmount ?? r.amount ?? 0
        ])
      ];
    }

    // ── Build MIS rows ────────────────────────────────────────────────────────
    const misRows: any[][] = [
      ["Date", "Consignor Name", "Vendor", "Vehicle No.", "Vehicle Ownership", "Actual Start", "Actual End", "Transit Time", "Total Hrs", "Extra Hrs", "Working Hours", "Start Odometer", "End Odometer", "Distance", "Extra Km", "Order Number", "Trip Log Number"],
      ...(reportData.misData || []).map((r: any) => [
        r.date ? new Date(r.date).toLocaleDateString('en-IN') : '',
        r.consignorName || '', r.vendor || '', r.vehicle || '', r.vehicleOwnership || '',
        r.actualStart || '', r.actualEnd || '', Math.round(Number(r.transit || 0)),
        r.total ?? 0, r.extra ?? 0, r.working ?? 0, r.startKm ?? 0, r.endKm ?? 0,
        r.distance ?? 0, r.extraKm ?? 0, r.orderNumber || '', r.tripLogNumber || ''
      ])
    ];

    // ── Generate single Excel with Invoice + Annexure + MIS sheets ────────────
    const invoiceBlob = await generateInvoiceExcel({
      invoiceNumber: invNo,
      invoiceDate,
      startDate,
      endDate,
      invoiceType,
      invoiceLocation,
      customerName: selectedCustomer?.name || 'Customer',
      customerGSTIN,
      costCode,
      projectName: selectedProject?.name || '',
      totalFreight,
      isInterState,
      logoBuffer,
      annexureRows: annexureRows.length > 0 ? annexureRows : undefined,
      misRows: misRows.length > 1 ? misRows : undefined,
    });

    // ── Single download ───────────────────────────────────────────────────────
    const url = URL.createObjectURL(invoiceBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Customer_Invoice_${invNo.replace(/\//g, '-')}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };


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
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate("/invoice")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Customer Invoices</h2>
              <p className="text-muted-foreground mt-1">
                Manage your accounts receivable and issue new invoices.
              </p>
            </div>
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
              <p className="text-muted-foreground mt-1 font-medium">
                {dynamicSubtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-2xl border border-border/60 shadow-sm select-none">
            <button
              type="button"
              disabled={!reportData}
              onClick={() => reportData && setCreateStep("mis")}
              className={`px-6 py-2.5 text-base font-semibold rounded-xl transition-all ${
                createStep === "mis"
                  ? "bg-blue-600 text-white shadow-md"
                  : reportData
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                  : "text-muted-foreground/30 cursor-not-allowed"
              }`}
            >
              MIS
            </button>
            <button
              type="button"
              disabled={!reportData}
              onClick={() => reportData && setCreateStep("annexures")}
              className={`px-6 py-2.5 text-base font-semibold rounded-xl transition-all ${
                createStep === "annexures"
                  ? "bg-blue-600 text-white shadow-md"
                  : reportData
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                  : "text-muted-foreground/30 cursor-not-allowed"
              }`}
            >
              Annexures
            </button>
            <button
              type="button"
              disabled={!reportData}
              onClick={() => reportData && setCreateStep("preview")}
              className={`px-6 py-2.5 text-base font-semibold rounded-xl transition-all ${
                createStep === "preview"
                  ? "bg-blue-600 text-white shadow-md"
                  : reportData
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                  : "text-muted-foreground/30 cursor-not-allowed"
              }`}
            >
              Invoice
            </button>
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
                  <label className="text-sm font-medium">State</label>
                  <select
                    value={invoiceLocation}
                    onChange={(e) => {
                      setInvoiceLocation(e.target.value);
                      setInvoiceType("");
                    }}
                    disabled={!invoiceProject || isMasterLoading}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select a state...</option>
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
            {createStep === "cards" && (
              <div className="py-8 px-6">
                {/* Header with Title and Download All Button */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 pb-6 border-b">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">Reports Generated</h3>
                    <p className="text-muted-foreground mt-1 font-medium">
                      {reportPeriodSubtitle}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="default"
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 font-semibold px-5 py-2 shadow-sm gap-2 shrink-0 transition-colors"
                    onClick={handleDownloadAll}
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    Download
                  </Button>
                </div>

                {/* 3 Interactive Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {/* MIS Card */}
                  <button
                    onClick={() => setCreateStep("mis")}
                    className="group relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-border bg-white p-8 text-center shadow-sm hover:border-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 group-hover:bg-green-200 transition-colors">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">MIS Report</h4>
                    </div>
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>

                  {/* Annexure Card */}
                  <button
                    onClick={() => setCreateStep("annexures")}
                    className="group relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-border bg-white p-8 text-center shadow-sm hover:border-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Annexure</h4>
                    </div>
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>

                  {/* Invoice Preview Card */}
                  <button
                    onClick={() => setCreateStep("preview")}
                    className="group relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-border bg-white p-8 text-center shadow-sm hover:border-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-colors">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Invoice</h4>
                    </div>
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {createStep === "mis" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">MIS Report</h3>
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
                    <h3 className="text-lg font-bold">Annexure Details</h3>
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


            {/* Hidden invoice container so PDF is always printable from any step (e.g. Download All) */}
            {reportData && createStep !== "preview" && (
              <div id="invoice-print-area-hidden" className="hidden">
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
                  invoiceNumber={previewInvoiceNumber}
                />
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
                  invoiceNumber={previewInvoiceNumber}
                />
              </div>
            )}

            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  if (createStep === "preview") setCreateStep("cards")
                  else if (createStep === "annexures") setCreateStep("cards")
                  else if (createStep === "mis") setCreateStep("cards")
                  else if (createStep === "cards") setCreateStep("details")
                  else {
                    setView("list")
                    setCreateStep("details")
                  }
                }}
              >
                {createStep === "details" ? "Cancel" : "← Back"}
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
                          const misCount = data?.misData?.length ?? 0;
                          const annexCount = (data?.flipkartAnnexureData ?? data?.flipkartAdhocAnnexureData ?? data?.annexureData ?? []).length;
                          
                          if (misCount === 0 && annexCount === 0) {
                            setNoDataModalOpen(true);
                            return;
                          }

                          setReportData(data);
                          // Generate invoice number NOW (at Proceed time) so it shows in preview
                          const fy = financialYear || '2025-2026';
                          const parts = fy.split('-');
                          const shortYear = parts.length >= 2 ? `${parts[0].slice(-2)}-${parts[1].slice(-2)}` : '25-26';
                          const randomNum = String(Math.floor(Math.random() * 999)).padStart(3, '0');
                          setPreviewInvoiceNumber(`CLPL/${shortYear}/${randomNum}`);
                          setCreateStep("cards");
                        }
                      });
                    }
                    else if (createStep === "preview") {
                      handleAddInvoice()
                    }
                  }}
                  className={createStep === "cards" || createStep === "mis" || createStep === "annexures" ? "hidden" : ""}
                >
                  {(reportMutation.isPending || createInvoiceMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {createInvoiceMutation.isPending
                    ? "Saving Invoice..."
                    : reportMutation.isPending
                    ? "Generating..."
                    : createStep === "preview"
                    ? "Save Invoice"
                    : "Proceed"}
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
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal: No Data Found */}
      <Modal
        isOpen={noDataModalOpen}
        onClose={() => setNoDataModalOpen(false)}
        size="md"
      >
        <div className="flex flex-col items-center text-center p-2">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            No Records Found
          </h3>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            There are no trip logs or billing records available for the selected parameters. Please check your selections and try again.
          </p>
          <div className="w-full bg-muted/40 rounded-xl p-3.5 text-xs text-left space-y-2 border mb-6 text-muted-foreground">
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Customer:</span>
              <span>{selectedCustomer?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Project:</span>
              <span>{selectedProject?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">State:</span>
              <span>{invoiceLocation || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Type & Period:</span>
              <span>{invoiceType || '—'} ({startDate || '—'} to {endDate || '—'})</span>
            </div>
          </div>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-xl text-sm"
            onClick={() => setNoDataModalOpen(false)}
          >
            Understood
          </Button>
        </div>
      </Modal>
    </div>
  )
}
