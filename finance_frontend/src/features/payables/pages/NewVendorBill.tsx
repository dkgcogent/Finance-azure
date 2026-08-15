import React, { useState, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Download } from "lucide-react"
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { useCustomerInvoices } from "@/features/invoicing/hooks/useCustomerInvoices"
import { useVendors, useVendorTrips, useCreateVendorInvoice } from "../hooks/useVendorInvoices"
import { useMasterData } from "@/features/invoicing/hooks/useInvoiceReports"

const mockAnnexureData = [
  { sno: 1, location: "SATELLITEHUB_ALD", trips: 3, rates: 1890, extraKm: 155, extraKmRate: 7.85, extraHrsRate: 63, fixedCost: 5670, extraKmCost: 1217, dcmCharges: 300, totalAmount: 7187 },
  { sno: 2, location: "SATELLITEHUB_ALDNAINI", trips: 7, rates: 1890, extraKm: 259, extraKmRate: 7.85, extraHrsRate: 63, fixedCost: 13230, extraKmCost: 2033, dcmCharges: 0, totalAmount: 15263 },
  { sno: 3, location: "SATELLITEHUB_BARABANKI", trips: 28, rates: 1890, extraKm: 1556, extraKmRate: 7.85, extraHrsRate: 63, fixedCost: 52920, extraKmCost: 12215, dcmCharges: 0, totalAmount: 65135 },
  { sno: 4, location: "SATELLITEHUB_DEO2", trips: 17, rates: 1890, extraKm: 968, extraKmRate: 7.85, extraHrsRate: 63, fixedCost: 32130, extraKmCost: 7599, dcmCharges: 1700, totalAmount: 41429 },
  { sno: 5, location: "SATELLITEHUB_BALLIA", trips: 1, rates: 1890, extraKm: 110, extraKmRate: 7.85, extraHrsRate: 63, fixedCost: 1890, extraKmCost: 864, dcmCharges: 0, totalAmount: 2754 },
  { sno: 6, location: "SATELLITEHUB_GHAZIPUR", trips: 1, rates: 1890, extraKm: 36, extraKmRate: 7.85, extraHrsRate: 63, fixedCost: 1890, extraKmCost: 283, dcmCharges: 100, totalAmount: 2273 },
  { sno: 7, location: "SATELLITEHUB_GKP", trips: 7, rates: 1890, extraKm: 342, extraKmRate: 7.85, extraHrsRate: 63, fixedCost: 13230, extraKmCost: 2685, dcmCharges: 700, totalAmount: 16615 },
  { sno: 8, location: "SATELLITEHUB_GKPMEDICAL", trips: 3, rates: 1890, extraKm: 107, extraKmRate: 7.85, extraHrsRate: 63, fixedCost: 5670, extraKmCost: 840, dcmCharges: 0, totalAmount: 6510 },
  { sno: 10, location: "SATELLITEHUB_KNP", trips: 2, rates: 1890, extraKm: 0, extraKmRate: 7.85, extraHrsRate: 63, fixedCost: 3780, extraKmCost: 0, dcmCharges: 200, totalAmount: 3980 },
  { sno: 11, location: "SATELLITEHUB_LKORAJAJI", trips: 1, rates: 1890, extraKm: 0, extraKmRate: 7.85, extraHrsRate: 63, fixedCost: 1890, extraKmCost: 0, dcmCharges: 0, totalAmount: 1890 },
  { sno: "", location: "SATELLITEHUB_AZAMGARH", trips: 4, rates: 1890, extraKm: 93, extraKmRate: 7.85, extraHrsRate: 63, fixedCost: 7560, extraKmCost: 730, dcmCharges: 0, totalAmount: 8290 },
  { sno: 12, location: "SATELLITEHUB_MAU", trips: 5, rates: 1890, extraKm: 228, extraKmRate: 7.85, extraHrsRate: 63, fixedCost: 9450, extraKmCost: 1790, dcmCharges: 500, totalAmount: 11740 },
]

const mockMisData = [
  { loc: "UP Large LM", vendor: "SENT LOGISTICS PRIVATE LIM...", vehNo: "UP51AT9093", vehType: "TATA ACE", ownType: "Adhoc", driverType: "Driver Cum Helpe", inTime: "9:03", outTime: "19:04", startOdo: 53077, endOdo: 53213, dist: 136, extKm: 36, extKmRate: 7.35, fixCost: 1890, extKmCost: 265, dcm: 100, total: 2255 },
  { loc: "UP Large LM", vendor: "SENT LOGISTICS PRIVATE LIM...", vehNo: "UP52AT6928", vehType: "TATA ACE", ownType: "Adhoc", driverType: "Driver Cum Helpe", inTime: "7:46", outTime: "21:26", startOdo: 15084, endOdo: 15237, dist: 153, extKm: 53, extKmRate: 7.35, fixCost: 1890, extKmCost: 390, dcm: 100, total: 2380 },
  { loc: "UP Large LM", vendor: "SENT LOGISTICS PRIVATE LIM...", vehNo: "UP52AT6928", vehType: "TATA ACE", ownType: "Adhoc", driverType: "Driver Cum Helpe", inTime: "8:26", outTime: "19:19", startOdo: 152037, endOdo: 152205, dist: 168, extKm: 68, extKmRate: 7.35, fixCost: 1890, extKmCost: 500, dcm: 100, total: 2490 },
  { loc: "UP Large LM", vendor: "SENT LOGISTICS PRIVATE LIM...", vehNo: "UP52AT6928", vehType: "TATA ACE", ownType: "Adhoc", driverType: "Driver Cum Helpe", inTime: "8:55", outTime: "20:35", startOdo: 152205, endOdo: 152365, dist: 160, extKm: 60, extKmRate: 7.35, fixCost: 1890, extKmCost: 441, dcm: 100, total: 2431 },
  { loc: "UP Large LM", vendor: "SENT LOGISTICS PRIVATE LIM...", vehNo: "UP32LN4846", vehType: "TATA ACE", ownType: "Adhoc", driverType: "Driver", inTime: "8:23", outTime: "20:10", startOdo: 204561, endOdo: 204655, dist: 94, extKm: 0, extKmRate: 7.35, fixCost: 1890, extKmCost: 0, dcm: 0, total: 1890 },
  { loc: "UP Large LM", vendor: "SENT LOGISTICS PRIVATE LIM...", vehNo: "UP70MT2942", vehType: "TATA ACE", ownType: "Adhoc", driverType: "Driver Cum Helpe", inTime: "7:00", outTime: "19:30", startOdo: 73859, endOdo: 74054, dist: 195, extKm: 95, extKmRate: 7.35, fixCost: 1890, extKmCost: 698, dcm: 100, total: 2688 },
  { loc: "UP Large LM", vendor: "SENT LOGISTICS PRIVATE LIM...", vehNo: "UP32LN4846", vehType: "TATA ACE", ownType: "Adhoc", driverType: "Driver", inTime: "7:00", outTime: "21:30", startOdo: 204955, endOdo: 205112, dist: 157, extKm: 57, extKmRate: 7.35, fixCost: 1890, extKmCost: 419, dcm: 0, total: 2309 },
  { loc: "UP Large LM", vendor: "SENT LOGISTICS PRIVATE LIM...", vehNo: "UP41AT2831", vehType: "TATA ACE", ownType: "Adhoc", driverType: "Driver", inTime: "9:13", outTime: "20:35", startOdo: 146826, endOdo: 146973, dist: 147, extKm: 47, extKmRate: 7.35, fixCost: 1890, extKmCost: 345, dcm: 0, total: 2235 },
  { loc: "UP Large LM", vendor: "SENT LOGISTICS PRIVATE LIM...", vehNo: "UP70MT2944", vehType: "TATA ACE", ownType: "Adhoc", driverType: "Driver", inTime: "9:35", outTime: "21:17", startOdo: 79427, endOdo: 79561, dist: 134, extKm: 34, extKmRate: 7.35, fixCost: 1890, extKmCost: 250, dcm: 0, total: 2140 },
  { loc: "UP Large LM", vendor: "SENT LOGISTICS PRIVATE LIM...", vehNo: "UP41AT1610", vehType: "TATA ACE", ownType: "Adhoc", driverType: "Driver", inTime: "8:23", outTime: "20:10", startOdo: 91645, endOdo: 91796, dist: 151, extKm: 51, extKmRate: 7.35, fixCost: 1890, extKmCost: 375, dcm: 0, total: 2265 },
]

const mockFixedAnnexureData = [
  { sno: 1, vehNo: "UP70LT0371", vehType: "Tata Ace", mode: "UP Large LM", loc: "SATELLITEHUB_ALD", vertical: "LM", hrs: 12, fixedKms: 1000, agRate: 34650, dieselHike: 0, totWithHike: 34650, workDays: 30, actualDays: 30, totKms: 3182, extHrAmt: 60, extHr: 0, extHrRate: 0, extKmRate: 7.35, dynFuel: 0.50, totExtKmRate: 7.85, perDayCost: 1155, perDayKm: 33.33, actualDeployed: 34650, extKm: 2182, extKmCharge: 17129, totalAmt: 51779, toll: 0, dcm: 3000, finalAmt: 54779 },
  { sno: 2, vehNo: "UP70JT2517", vehType: "Tata Ace", mode: "UP Large LM", loc: "SATELLITEHUB_ALDNAINI", vertical: "LM", hrs: 12, fixedKms: 1000, agRate: 34650, dieselHike: 0, totWithHike: 34650, workDays: 30, actualDays: 30, totKms: 4647, extHrAmt: 60, extHr: 0, extHrRate: 0, extKmRate: 7.35, dynFuel: 0.50, totExtKmRate: 7.85, perDayCost: 1155, perDayKm: 33.33, actualDeployed: 34650, extKm: 3647, extKmCharge: 28629, totalAmt: 63279, toll: 0, dcm: 0, finalAmt: 63279 },
  { sno: 3, vehNo: "UP32RN3101", vehType: "Tata Ace", mode: "UP Large LM", loc: "SATELLITEHUB_ALDNAINI", vertical: "LM", hrs: 12, fixedKms: 1000, agRate: 34650, dieselHike: 0, totWithHike: 34650, workDays: 30, actualDays: 30, totKms: 4185, extHrAmt: 60, extHr: 0, extHrRate: 0, extKmRate: 7.35, dynFuel: 0.50, totExtKmRate: 7.85, perDayCost: 1155, perDayKm: 33.33, actualDeployed: 34650, extKm: 3185, extKmCharge: 25005, totalAmt: 59655, toll: 0, dcm: 0, finalAmt: 59655 },
]

const mockFixedMisData = [
  { date: "01-06-2026", hub: "SATELLITEHUB_VNS", loc: "UP Large LM", vendor: "COGENT LOGISTICS PRIVATE...", vehNo: "UP65QT1502", vehType: "TATA ACE", parentVeh: "UP65QT1502", ownType: "Regular", driverType: "Driver Cum Helper", inTime: "6.55", outTime: "20.36", startOdo: 27388, endOdo: 27446, dist: 58 },
  { date: "01-06-2026", hub: "SATELLITEHUB_VNS", loc: "UP Large LM", vendor: "COGENT LOGISTICS PRIVATE...", vehNo: "UP65KT8928", vehType: "TATA ACE", parentVeh: "UP65KT8928", ownType: "Regular", driverType: "Driver", inTime: "7.46", outTime: "21.26", startOdo: 118207, endOdo: 118310, dist: 103 },
  { date: "01-06-2026", hub: "SATELLITEHUB_BNS", loc: "UP Large LM", vendor: "COGENT LOGISTICS PRIVATE...", vehNo: "UP65GT6138", vehType: "TATA ACE", parentVeh: "UP65GT6138", ownType: "Regular", driverType: "Driver", inTime: "8.20", outTime: "22.06", startOdo: 147527, endOdo: 147627, dist: 100 },
  { date: "01-06-2026", hub: "SATELLITEHUB_BALLIA", loc: "UP Large LM", vendor: "COGENT LOGISTICS PRIVATE...", vehNo: "UP54AT3575", vehType: "TATA ACE", parentVeh: "UP54AT3575", ownType: "Regular", driverType: "Driver", inTime: "6.50", outTime: "21.46", startOdo: 135226, endOdo: 135342, dist: 116 },
]

import { numberToWords } from "@/lib/utils"

export default function NewVendorBill({ onCancel }: { onCancel?: () => void }) {
  const [step, setStep] = useState<"details" | "mis" | "annexure" | "preview">("details")
  const [customerId, setCustomerId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [locationId, setLocationId] = useState("")
  const [linkedInvoice, setLinkedInvoice] = useState("")
  const [vehicleType, setVehicleType] = useState("")
  const [vendorId, setVendorId] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [costCode, setCostCode] = useState("")

  const { customers, projects, locations, isLoading: isMasterLoading } = useMasterData();
  const { data: customerInvoices } = useCustomerInvoices('25-26');
  const { data: vendors } = useVendors();
  const { data: vendorTrips, isLoading: isTripsLoading } = useVendorTrips(vendorId, startDate, endDate, vehicleType, customerId, projectId, locationId);

  const filteredProjects = useMemo(() => {
    if (!customerId) return [];
    return projects.filter((p: any) => String(p.customerId) === String(customerId));
  }, [projects, customerId]);

  const filteredLocations = useMemo(() => {
    if (!customerId) return [];
    const locs = locations.filter((l: any) => String(l.customerId) === String(customerId));
    const seenNames = new Set<string>();
    return locs.filter((l: any) => {
      const name = (l.name || '').trim();
      if (!name || seenNames.has(name)) return false;
      seenNames.add(name);
      return true;
    });
  }, [locations, customerId]);

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    setProjectId("");
    setLocationId("");
    setVehicleType("");
  };

  const createInvoiceMutation = useCreateVendorInvoice();
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

  const handleDownloadPDF = () => {
    if (!pdfRef.current) return;

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
              ${pdfRef.current.innerHTML}
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

  const handleNext = async () => {
    if (step === "details") {
      setStep("mis")
    } else if (step === "mis") {
      setStep("annexure")
    } else if (step === "annexure") {
      setStep("preview")
    } else if (step === "preview") {
      // Final submit
      try {
        const amount = Number((vendorTrips?.misData || []).reduce((acc: number, row: any) => acc + (row.totalAmount || row.finalAmt || 0), 0));
        const vendorNameStr = vendorTrips?.vendorInfo?.VendorName || vendors?.find(v => v.id.toString() === vendorId)?.name || 'Unknown Vendor';

        const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
        const stylesHtml = styleElements.map(el => el.outerHTML).join('\n');
        const htmlPayload = pdfRef.current ? `
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
                ${pdfRef.current.innerHTML}
              </div>
            </body>
          </html>
        ` : undefined;

        await createInvoiceMutation.mutateAsync({
          vendorName: vendorNameStr,
          amount: amount,
          linkedCustomerInvoice: linkedInvoice,
          financialYear: '26-27',
          html: htmlPayload,
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });

        if (onCancel) onCancel(); // Close screen
      } catch (error) {
        console.error("Failed to save vendor invoice", error);
      }
    }
  }

  const handlePrev = () => {
    if (step === "preview") {
      setStep("annexure")
    } else if (step === "annexure") {
      setStep("mis")
    } else if (step === "mis") {
      setStep("details")
    } else {
      if (onCancel) onCancel()
    }
  }

  const handleExportCSV = () => {
    let dataToExport = [];
    let keys: string[] = [];
    let labels: string[] = [];

    if (step === "mis") {
      dataToExport = vendorTrips?.annexureData || [];
      if (vehicleType === "adhoc") {
        keys = ["date", "hub", "loc", "vendor", "vehNo", "vehType", "parentVeh", "ownType", "driverType", "inTime", "outTime", "startOdo", "endOdo", "dist", "extraKm"];
        labels = ["Date", "Hub Name", "Billing Location", "Vendor", "Vehicle Number", "Vehicle Type", "Parent Vehicle", "Vehicle Ownership Type", "Driver Type", "In Time", "Out Time", "Start Odometer", "End Odometer", "Distance", "Extra Km"];
      } else {
        keys = ["date", "hub", "loc", "vendor", "vehNo", "vehType", "parentVeh", "ownType", "driverType", "inTime", "outTime", "startOdo", "endOdo", "dist"];
        labels = ["Date", "Hub Name", "Billing Location", "Vendor", "Vehicle Number", "Vehicle Type", "Parent Vehicle", "Vehicle Ownership Type", "Driver Type", "In Time", "Out Time", "Start Odometer", "End Odometer", "Distance"];
      }
    } else if (step === "annexure") {
      dataToExport = vendorTrips?.misData || [];
      if (vehicleType === "adhoc") {
        keys = ["id", "location", "noOfTrips", "rates", "extraKm", "extraKmRate", "extraHrsRate", "fixedCost", "extraKmCost", "dcmCharges", "totalAmount"];
        labels = ["S. No.", "Location", "No Of Trips", "Rates", "Extra KM", "Extra KM Rate", "Extra Hrs Rate", "Fixed Cost", "Extra KM Cost", "DCM Charges", "Total Amount"];
      } else {
        keys = ["id", "vehNo", "vehType", "mode", "loc", "vertical", "hrs", "fixedKms", "agRate", "dieselHike", "totWithHike", "workDays", "actualDays", "totKms", "extHrAmt", "extHr", "extHrRate", "extKmRate", "dynFuel", "totExtKmRate", "perDayCost", "perDayKm", "actualDeployed", "extKm", "extKmCharge", "totalAmt", "toll", "dcm", "finalAmt"];
        labels = ["S.No.", "Vehicle Number", "Type of Vehicle", "Mode", "Location", "Vertical", "No. of hours", "Fixed Kms", "Agreement Rate", "Diesel Hike", "Total Charges with Diesel Hike", "Nos. of Working days", "Nos of days actual done", "Total KMs", "Extra Hour Amount", "Extra Hour", "Extra Hours Rate", "Extra KM rate", "Dynamic Fuel incr", "Extra KM Rate D", "Per Day Cost", "Per Day KM Conside", "Actual Deployed Days", "Extra Km", "Extra Km Charge", "Total Amount", "Toll charges", "DCM Charges", "Final Amount"];
      }
    }

    if (!dataToExport.length) return;

    const formatForExcel = (val: any, key: string) => {
      if (val === null || val === undefined) return '';
      let strVal = val.toString();

      // Force text rendering in Excel to prevent scientific notation (9.03E+10) or ######## width issues
      if (key === 'date' || key === 'vehNo' || key === 'parentVeh' || key === 'vehicleNumber' || key === 'inTime' || key === 'outTime') {
        strVal = ` ${strVal}`;
      }

      return strVal.replace(/"/g, '""');
    };

    const csvContent = [
      labels.map(l => `"${l}"`).join(","),
      ...dataToExport.map((row: any) => keys.map(k => `"${formatForExcel(row[k], k)}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Vendor_Invoice_${step}_${vehicleType}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 pb-8">
      {/* Header matching Create Invoice */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        {step === "preview" ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="rounded-full shadow-sm" onClick={handlePrev}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-3xl font-bold tracking-tight">VN/26-27/002</h2>
            </div>
            <div className="flex items-center gap-2 ml-14">
              <span className="text-muted-foreground text-sm font-medium">Vendor Bill Details</span>
              <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-xs font-medium">Pending Verification</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handlePrev}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Create Vendor Invoice</h2>
              <p className="text-muted-foreground mt-1">
                Draft a new vendor invoice linked to customer billing.
              </p>
            </div>
          </div>
        )}

        {step === "preview" ? (
          <Button variant="outline" className="gap-2 bg-white shadow-sm" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        ) : (
          <div className="flex items-center gap-3 text-sm font-medium bg-muted/50 px-4 py-2 rounded-full">
            <span className={step === "details" ? "text-primary font-bold" : "text-muted-foreground"}>Creating</span>
            <span className="text-muted-foreground">→</span>
            <span className={step === "mis" ? "text-primary font-bold" : "text-muted-foreground"}>MIS</span>
            <span className="text-muted-foreground">→</span>
            <span className={step === "annexure" ? "text-primary font-bold" : "text-muted-foreground"}>Annexure</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-muted-foreground">Preview</span>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">

          {step === "details" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Customer</label>
                <select
                  value={customerId}
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
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setLocationId("");
                    setVehicleType("");
                  }}
                  disabled={!customerId || isMasterLoading}
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
                  value={locationId}
                  onChange={(e) => {
                    setLocationId(e.target.value);
                    setVehicleType("");
                  }}
                  disabled={!projectId || isMasterLoading}
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
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  disabled={!locationId}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select type...</option>
                  <option value="fixed">Fixed</option>
                  <option value="adhoc">Adhoc</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Vendor Name</label>
                <Select value={vendorId} onValueChange={(val) => setVendorId(val || "")}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Select vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors?.map(v => (
                      <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Period</label>
                <div className="flex items-center gap-2">
                  <input type="date" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  <span className="text-muted-foreground text-sm font-medium">to</span>
                  <input type="date" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Issue Date</label>
                <input type="date" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cost Code</label>
                <input type="text" placeholder="e.g. 4462" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={costCode} onChange={e => setCostCode(e.target.value)} />
              </div>

              {/* <div className="space-y-2">
                <label className="text-sm font-medium">Linked Invoice No. <span className="text-xs text-muted-foreground">(Optional)</span></label>
                <Select value={linkedInvoice} onValueChange={(val) => setLinkedInvoice(val || "")}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Select a customer invoice..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customerInvoices?.map((inv: any) => (
                      <SelectItem key={inv.id} value={inv.invoiceNumber}>
                        {inv.invoiceNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div> */}
            </div>
          )}

          {(step === "mis" || step === "annexure") && (
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">{step === "mis" ? "MIS Report" : "Annexure"}</h3>
                <p className="text-sm text-muted-foreground">
                  {step === "mis" ? "Raw trip data from the selected parameters." : "Detailed summary and calculations."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {step === "annexure" && (
                  <Button variant="outline" size="sm" onClick={handleDownloadAnnexurePDF}>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Excel
                </Button>
              </div>
            </div>
          )}



          {step === "annexure" && vehicleType === "adhoc" && (
            <div className="overflow-x-auto w-full pb-4" ref={annexurePdfRef}>
              <table className="w-full border-collapse border border-black text-xs text-center">
                <thead>
                  <tr className="bg-muted/10">
                    <th className="border border-black p-1 font-bold">S. No.</th>
                    <th className="border border-black p-1 font-bold">Location</th>
                    <th className="border border-black p-1 font-bold">No Of Trips</th>
                    <th className="border border-black p-1 font-bold">Rates</th>
                    <th className="border border-black p-1 font-bold">Extra KM</th>
                    <th className="border border-black p-1 font-bold">Extra KM Rate</th>
                    <th className="border border-black p-1 font-bold">Extra Hrs Rate</th>
                    <th className="border border-black p-1 font-bold">Fixed Cost</th>
                    <th className="border border-black p-1 font-bold">Extra KM Cost</th>
                    <th className="border border-black p-1 font-bold">DCM Charges</th>
                    <th className="border border-black p-1 font-bold">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(vendorTrips?.misData || []).map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="border border-black p-1">{row.id}</td>
                      <td className="border border-black p-1 font-medium">{row.location}</td>
                      <td className="border border-black p-1">{row.noOfTrips}</td>
                      <td className="border border-black p-1">{row.rates}</td>
                      <td className="border border-black p-1">{row.extraKm}</td>
                      <td className="border border-black p-1">{row.extraKmRate}</td>
                      <td className="border border-black p-1">{row.extraHrsRate}</td>
                      <td className="border border-black p-1">{row.fixedCost}</td>
                      <td className="border border-black p-1">{row.extraKmCost}</td>
                      <td className="border border-black p-1">{row.dcmCharges}</td>
                      <td className="border border-black p-1 text-right pr-2">{Number(row.totalAmount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-muted/10">
                    <td colSpan={2} className="border border-black p-2 text-center text-sm">Total</td>
                    <td colSpan={8} className="border border-black p-2"></td>
                    <td className="border border-black p-2 text-right text-sm pr-2">
                      {Number((vendorTrips?.misData || []).reduce((acc: number, row: any) => acc + (row.totalAmount || 0), 0)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {step === "annexure" && vehicleType === "fixed" && (
            <div className="overflow-x-auto w-full pb-4" ref={annexurePdfRef}>
              <table className="w-[2000px] max-w-none border-collapse border border-black text-[10px] text-center">
                <thead>
                  <tr className="bg-muted/10">
                    <th className="border border-black p-1 font-bold">S.No.</th>
                    <th className="border border-black p-1 font-bold">Vehicle No</th>
                    <th className="border border-black p-1 font-bold">Type of Vehicle</th>
                    <th className="border border-black p-1 font-bold">Mode</th>
                    <th className="border border-black p-1 font-bold">Location</th>
                    <th className="border border-black p-1 font-bold">Vertical</th>
                    <th className="border border-black p-1 font-bold">No. of hours</th>
                    <th className="border border-black p-1 font-bold">Fixed Kms</th>
                    <th className="border border-black p-1 font-bold">Agreement Rate</th>
                    <th className="border border-black p-1 font-bold">Diesel Hike</th>
                    <th className="border border-black p-1 font-bold">Total Charges with Diesel Hike</th>
                    <th className="border border-black p-1 font-bold">Nos. of Working days to be done</th>
                    <th className="border border-black p-1 font-bold">Nos of days actual done</th>
                    <th className="border border-black p-1 font-bold">Total KMs</th>
                    <th className="border border-black p-1 font-bold">Extra Hour Amount</th>
                    <th className="border border-black p-1 font-bold">Extra Hour</th>
                    <th className="border border-black p-1 font-bold">Extra Hours Rate</th>
                    <th className="border border-black p-1 font-bold">Extra KM rate</th>
                    <th className="border border-black p-1 font-bold">Dynamic Fuel incr</th>
                    <th className="border border-black p-1 font-bold">Extra KM Rate D</th>
                    <th className="border border-black p-1 font-bold">Per Day Cost (MG)</th>
                    <th className="border border-black p-1 font-bold">Per Day KM Conside</th>
                    <th className="border border-black p-1 font-bold">Actual Deployed Days Excluding extra Km</th>
                    <th className="border border-black p-1 font-bold">Extra Km</th>
                    <th className="border border-black p-1 font-bold">Extra Km Charge</th>
                    <th className="border border-black p-1 font-bold">Total Amount</th>
                    <th className="border border-black p-1 font-bold">Toll charges (Parking & Toll)</th>
                    <th className="border border-black p-1 font-bold">DCM Charges</th>
                    <th className="border border-black p-1 font-bold">Final Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(vendorTrips?.misData || []).map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="border border-black p-1">{row.id}</td>
                      <td className="border border-black p-1 font-bold bg-yellow-300">{row.vehNo}</td>
                      <td className="border border-black p-1">{row.vehType}</td>
                      <td className="border border-black p-1">{row.mode}</td>
                      <td className="border border-black p-1">{row.loc}</td>
                      <td className="border border-black p-1">{row.vertical}</td>
                      <td className="border border-black p-1">{row.hrs}</td>
                      <td className="border border-black p-1">{row.fixedKms}</td>
                      <td className="border border-black p-1">{row.agRate}</td>
                      <td className="border border-black p-1">{row.dieselHike}</td>
                      <td className="border border-black p-1">{row.totWithHike}</td>
                      <td className="border border-black p-1">{row.workDays}</td>
                      <td className="border border-black p-1">{row.actualDays}</td>
                      <td className="border border-black p-1">{row.totKms}</td>
                      <td className="border border-black p-1">{row.extHrAmt}</td>
                      <td className="border border-black p-1">{row.extHr}</td>
                      <td className="border border-black p-1">{row.extHrRate}</td>
                      <td className="border border-black p-1">{row.extKmRate}</td>
                      <td className="border border-black p-1 font-bold bg-yellow-300">{row.dynFuel.toFixed(2)}</td>
                      <td className="border border-black p-1">{row.totExtKmRate}</td>
                      <td className="border border-black p-1">{Number(row.perDayCost || 0).toFixed(2)}</td>
                      <td className="border border-black p-1">{Number(row.perDayKm || 0).toFixed(2)}</td>
                      <td className="border border-black p-1">{row.actualDeployed}</td>
                      <td className="border border-black p-1">{row.extKm}</td>
                      <td className="border border-black p-1">{row.extKmCharge}</td>
                      <td className="border border-black p-1">{row.totalAmt}</td>
                      <td className="border border-black p-1">{row.toll}</td>
                      <td className="border border-black p-1">{row.dcm}</td>
                      <td className="border border-black p-1 font-medium">{row.finalAmt}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-muted/10">
                    <td colSpan={28} className="border border-black p-2 text-right pr-4 text-sm">Total</td>
                    <td className="border border-black p-2 text-center text-sm font-bold">{Number((vendorTrips?.misData || []).reduce((acc: number, row: any) => acc + (parseFloat(row.finalAmt || row.totalAmount || '0') || 0), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {step === "mis" && (
            <div className="overflow-x-auto w-full pb-4">
              <table className="w-full border-collapse border border-black text-[10px] text-center">
                <thead>
                  <tr className="bg-muted/10">
                    <th className="border border-black p-1 font-bold">Date</th>
                    <th className="border border-black p-1 font-bold">Hub Name</th>
                    <th className="border border-black p-1 font-bold">Billing Location</th>
                    <th className="border border-black p-1 font-bold">Vendor</th>
                    <th className="border border-black p-1 font-bold">Vehicle Number</th>
                    <th className="border border-black p-1 font-bold">Vehicle Type</th>
                    <th className="border border-black p-1 font-bold">Parent Vehicle</th>
                    <th className="border border-black p-1 font-bold">Vehicle Ownership Type</th>
                    <th className="border border-black p-1 font-bold">Driver Type</th>
                    <th className="border border-black p-1 font-bold">In Time</th>
                    <th className="border border-black p-1 font-bold">Out Time</th>
                    <th className="border border-black p-1 font-bold">Start Odometer</th>
                    <th className="border border-black p-1 font-bold">End Odometer</th>
                    <th className="border border-black p-1 font-bold">Distance</th>
                    {vehicleType === "adhoc" && <th className="border border-black p-1 font-bold">Extra Km</th>}
                  </tr>
                </thead>
                <tbody>
                  {(vendorTrips?.annexureData || []).map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="border border-black p-1">{row.date}</td>
                      <td className="border border-black p-1">{row.hub || row.location}</td>
                      <td className="border border-black p-1">{row.loc || row.location}</td>
                      <td className="border border-black p-1 text-left">{row.vendor}</td>
                      <td className="border border-black p-1">{row.vehNo || row.vehicleNumber}</td>
                      <td className="border border-black p-1">{row.vehType || row.vehicleType}</td>
                      <td className="border border-black p-1 font-medium">{row.parentVeh || row.vehicleNumber}</td>
                      <td className="border border-black p-1">{row.ownType || row.vehicleOwnership}</td>
                      <td className="border border-black p-1">{row.driverType || 'Driver'}</td>
                      <td className="border border-black p-1">{row.inTime}</td>
                      <td className="border border-black p-1">{row.outTime}</td>
                      <td className="border border-black p-1">{row.startOdo ?? row.startOdometer}</td>
                      <td className="border border-black p-1">{row.endOdo ?? row.endOdometer}</td>
                      <td className="border border-black p-1 font-medium">{row.dist ?? row.distance}</td>
                      {vehicleType === "adhoc" && (
                        <td className="border border-black p-1 font-medium">
                          {row.extraKm ?? Math.max(0, (row.dist ?? row.distance ?? 0) - 100)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {step === "preview" && (
            <div className="flex flex-col w-full overflow-x-auto">
              <div
                ref={pdfRef}
                className="w-[900px] mx-auto border-[3px] border-black bg-white text-black font-sans mb-8 shrink-0"
              >
                <div className="bg-yellow-300 text-center py-6 px-4 border-b-[3px] border-black">
                  <h1 className="text-2xl font-bold mb-2">{vendorTrips?.vendorInfo?.VendorName || vendors?.find(v => v.id.toString() === vendorId)?.name || 'Vendor Name'}</h1>
                  <p className="text-base font-medium">{vendorTrips?.vendorInfo?.VendorAddress || 'Vendor Address and Contact Details'}</p>
                </div>

                <div className="text-center font-bold text-lg py-1 border-b-[3px] border-black tracking-widest underline underline-offset-4">
                  BILL OF SUPPLY
                </div>

                <div className="grid grid-cols-2 border-b-[3px] border-black text-sm">
                  <div className="border-r-[3px] border-black">
                    <div className="flex border-b-[3px] border-black">
                      <div className="w-[140px] font-bold p-1 pl-2 border-r-[3px] border-black">Invoice No.</div>
                      <div className="flex-1 p-1 pl-2">: VN/26-27/001</div>
                    </div>
                    <div className="flex border-b-[3px] border-black">
                      <div className="w-[140px] font-bold p-1 pl-2 border-r-[3px] border-black">Our GSTIN</div>
                      <div className="flex-1 p-1 pl-2"></div>
                    </div>
                    <div className="flex">
                      <div className="w-[140px] font-bold p-1 pl-2 border-r-[3px] border-black">Service Category</div>
                      <div className="flex-1 p-1 pl-2">: Transportation</div>
                    </div>
                  </div>
                  <div>
                    <div className="flex border-b-[3px] border-black">
                      <div className="w-[140px] font-bold p-1 pl-2 border-r-[3px] border-black">Date</div>
                      <div className="flex-1 p-1 pl-2">: {issueDate ? new Date(issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : ''}</div>
                    </div>
                    <div className="flex border-b-[3px] border-black">
                      <div className="w-[140px] font-bold p-1 pl-2 border-r-[3px] border-black">Invoice Under RCM</div>
                      <div className="flex-1 p-1 pl-2 relative">
                        <span className="line-through decoration-2 mr-2">Yes</span> No
                      </div>
                    </div>
                    <div className="flex">
                      <div className="w-[140px] font-bold p-1 pl-2 border-r-[3px] border-black">Customer PO No.</div>
                      <div className="flex-1 p-1 pl-2">: Agreement</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 border-b-[3px] border-black text-sm min-h-[140px]">
                  <div className="border-r-[3px] border-black p-2 pl-4">
                    <div className="flex justify-between font-bold mb-4">
                      <span className="underline">Invoice To :-</span>
                      <span>GSTIN - 07AAFCC4715N1Z</span>
                    </div>
                    <div className="font-bold text-base leading-tight">
                      Cogent Logistics Private Limited<br />
                      201C/6, 2nd Floor, D-21 Corporate Park,<br />
                      Sector 21, Dwarka, New Delhi - 110077
                    </div>
                  </div>
                  <div className="p-2 pl-4">
                    <div className="font-bold mb-4 underline">Invoice For/ Place Of Supply :-</div>
                    <div className="font-bold text-base leading-tight">
                      Cogent Logistics Private Limited<br />
                      201C/6, 2nd Floor, D-21 Corporate Park, Sector<br />
                      21, Dwarka, New Delhi - 110077
                    </div>
                  </div>
                </div>

                <div className="border-b-[3px] border-black">
                  <div className="text-center font-bold border-b-[3px] border-black p-1 text-sm">Article Description</div>
                  <div className="text-center font-bold p-3 text-sm">
                    {(() => {
                      const getOrdinal = (n: number) => {
                        const s = ["th", "st", "nd", "rd"];
                        const v = n % 100;
                        return n + (s[(v - 20) % 10] || s[v] || s[0]);
                      };
                      const start = startDate ? new Date(startDate) : new Date();
                      const end = endDate ? new Date(endDate) : new Date();
                      const startMonth = start.toLocaleDateString('en-GB', { month: 'long' });
                      const endMonth = end.toLocaleDateString('en-GB', { month: 'long' });
                      const year = end.getFullYear();

                      let locStr = "UP";
                      const selectedLocObj = locations.find((l: any) => String(l.id) === String(locationId));
                      if (selectedLocObj?.name) {
                        locStr = selectedLocObj.name;
                      } else if (vendorTrips?.misData && vendorTrips.misData.length > 0) {
                        const firstLoc = vendorTrips.misData[0].loc || vendorTrips.misData[0].location || "";
                        if (firstLoc.includes("-")) {
                          locStr = firstLoc.split("-")[0].trim();
                        } else if (firstLoc.includes("SATELLITEHUB_")) {
                          locStr = firstLoc.split("_")[1] || "UP";
                        } else {
                          locStr = firstLoc.split(" ")[0] || "UP";
                        }
                      }
                      const tripTypeStr = vehicleType === 'fixed' ? 'Fix' : 'Adhoc';

                      return `${tripTypeStr} Transportation Charges ${locStr} for the Period Of ${getOrdinal(start.getDate())} ${startMonth} to ${getOrdinal(end.getDate())} ${endMonth} ${year} (as per annexure attached)`;
                    })()}
                  </div>
                </div>

                <table className="w-full text-center border-b-[3px] border-black text-sm border-collapse">
                  <thead>
                    <tr className="border-b-[3px] border-black font-bold">
                      <th className="border-r-[3px] border-black p-1 w-16">S No</th>
                      <th className="border-r-[3px] border-black p-1 w-32">HSN/SAC</th>
                      <th className="border-r-[3px] border-black p-1">Description</th>
                      <th className="border-r-[3px] border-black p-1 w-32">Cost Code</th>
                      <th className="p-1 w-40">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b-[3px] border-black">
                      <td className="border-r-[3px] border-black p-1">1</td>
                      <td className="border-r-[3px] border-black p-1">996601</td>
                      <td className="border-r-[3px] border-black p-1">Transportation Charges</td>
                      <td className="border-r-[3px] border-black p-1">{costCode || '4477'}</td>
                      <td className="p-1">{Number((vendorTrips?.misData || []).reduce((acc: number, row: any) => acc + (parseFloat(row.finalAmt || row.totalAmount || '0') || 0), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="border-b-[3px] border-black h-8">
                      <td className="border-r-[3px] border-black"></td>
                      <td className="border-r-[3px] border-black"></td>
                      <td className="border-r-[3px] border-black"></td>
                      <td className="border-r-[3px] border-black"></td>
                      <td></td>
                    </tr>
                    <tr className="border-b-[3px] border-black h-8">
                      <td className="border-r-[3px] border-black"></td>
                      <td className="border-r-[3px] border-black"></td>
                      <td className="border-r-[3px] border-black"></td>
                      <td className="border-r-[3px] border-black"></td>
                      <td></td>
                    </tr>
                    <tr>
                      <td className="border-r-[3px] border-black"></td>
                      <td className="border-r-[3px] border-black"></td>
                      <td className="border-r-[3px] border-black"></td>
                      <td className="border-r-[3px] border-black p-1 font-bold">Total</td>
                      <td className="p-1">{Number((vendorTrips?.misData || []).reduce((acc: number, row: any) => acc + (parseFloat(row.finalAmt || row.totalAmount || '0') || 0), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="border-b-[3px] border-black text-sm">
                  <div className="font-bold underline p-2">Our Bank Details :-</div>
                  <table className="w-full text-left border-collapse border-t-[3px] border-black">
                    <tbody>
                      <tr className="border-b-[3px] border-black">
                        <td className="border-r-[3px] border-black p-1 pl-2 w-[180px]">Account Holder Name</td>
                        <td className="p-1 pl-2 font-medium">{vendorTrips?.vendorInfo?.AccountHolderName || vendorTrips?.vendorInfo?.VendorName || ''}</td>
                      </tr>
                      <tr className="border-b-[3px] border-black">
                        <td className="border-r-[3px] border-black p-1 pl-2">Bank Name</td>
                        <td className="p-1 pl-2 font-medium">{vendorTrips?.vendorInfo?.BankName || ''}</td>
                      </tr>
                      <tr className="border-b-[3px] border-black">
                        <td className="border-r-[3px] border-black p-1 pl-2">Account No.</td>
                        <td className="p-1 pl-2 font-medium">{vendorTrips?.vendorInfo?.AccountNumber || ''}</td>
                      </tr>
                      <tr className="border-b-[3px] border-black">
                        <td className="border-r-[3px] border-black p-1 pl-2">IFSC Code</td>
                        <td className="p-1 pl-2 font-medium">{vendorTrips?.vendorInfo?.IFSCCode || ''}</td>
                      </tr>
                      <tr>
                        <td className="border-r-[3px] border-black p-1 pl-2">Branch</td>
                        <td className="p-1 pl-2 font-medium">{vendorTrips?.vendorInfo?.BranchName || ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="border-b-[3px] border-black text-sm flex font-bold">
                  <div className="flex-1 border-r-[3px] border-black flex flex-col justify-center">
                    <div className="border-b-[3px] border-black p-1 pl-2 w-full">Amount in Words :</div>
                    <div className="p-1 pl-2 font-normal">-- {numberToWords(Number((vendorTrips?.misData || []).reduce((acc: number, row: any) => acc + (parseFloat(row.finalAmt || row.totalAmount || '0') || 0), 0)))} --</div>
                  </div>
                  <div className="w-[140px] border-r-[3px] border-black p-1 text-center flex items-center justify-center">Total</div>
                  <div className="w-[160px] p-1 pr-2 text-right flex items-center justify-end">{Number((vendorTrips?.misData || []).reduce((acc: number, row: any) => acc + (parseFloat(row.finalAmt || row.totalAmount || '0') || 0), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>

                <div className="border-b-[3px] border-black text-sm relative min-h-[120px]">
                  <div className="absolute top-2 right-4 font-bold">For Cogent Logistics Private Limited</div>
                  <div className="absolute bottom-2 right-12 text-xs">Authorised Signatory</div>
                </div>

                <div className="p-2 text-[11px] text-center leading-tight">
                  Note: Under this invoice,we are providing services by way of transportation of goods by road to a Goods Transportation Agency. Services provided by us are exempted from payment of GST as per notification issued by Govt.
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-8 pt-6 border-t">
            <Button variant="outline" onClick={handlePrev}>Prev</Button>

            <div className="flex items-center gap-4">
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleNext}
                disabled={step === "details" && !vehicleType}
              >
                {step === "preview" ? "Submit" : "Next"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

