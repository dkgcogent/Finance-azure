import React, { useState, useRef, useMemo } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Download, Loader2, AlertCircle } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { useCustomerInvoices } from "@/features/invoicing/hooks/useCustomerInvoices"
import { useVendors, useVendorTrips, useCreateVendorInvoice, useNextVendorInvoiceNumber } from "../hooks/useVendorInvoices"
import { useMasterData } from "@/features/invoicing/hooks/useInvoiceReports"
import { generateVendorInvoiceExcel } from "../utils/generateVendorInvoiceExcel"
import { exportTableToExcel } from "@/lib/excelExportHelper"

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
  const [step, setStep] = useState<"details" | "cards" | "mis" | "annexure" | "preview">("details")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [noDataModalOpen, setNoDataModalOpen] = useState(false)
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
  const { data: nextInvoiceNumData } = useNextVendorInvoiceNumber();
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

  const selectedCustomer = useMemo(() =>
    customers.find((c: any) => String(c.id) === String(customerId)),
    [customers, customerId]
  );
  const selectedProject = useMemo(() =>
    projects.find((p: any) => String(p.id) === String(projectId)),
    [projects, projectId]
  );
  const selectedLocation = useMemo(() =>
    locations.find((l: any) => String(l.id) === String(locationId)),
    [locations, locationId]
  );
  const selectedVendor = useMemo(() =>
    vendors?.find((v: any) => String(v.id) === String(vendorId)),
    [vendors, vendorId]
  );

  const dynamicSubtitle = useMemo(() => {
    const cust = selectedCustomer?.name?.split(' (')[0] || selectedCustomer?.name;
    const proj = selectedProject?.name;
    const loc = selectedLocation?.name;
    const vend = selectedVendor?.name;

    if (vend && proj && loc) {
      return `For ${vend} (${cust || ''}) of ${proj} Project in ${loc}`;
    } else if (cust && proj && loc) {
      return `For the ${cust} of ${proj} Project in ${loc}`;
    } else if (cust && proj) {
      return `For the ${cust} of ${proj} Project`;
    } else if (cust && loc) {
      return `For the ${cust} in ${loc}`;
    } else if (cust) {
      return `For ${cust}`;
    }
    return "Draft a new vendor invoice linked to customer billing.";
  }, [selectedCustomer, selectedProject, selectedLocation, selectedVendor]);

  const reportPeriodSubtitle = useMemo(() => {
    const formatD = (d?: string) => {
      if (!d) return '';
      const parts = d.split('-');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      return d;
    };
    const range = (startDate && endDate) ? `${formatD(startDate)} to ${formatD(endDate)}` : '';
    const typeStr = vehicleType ? `${vehicleType === 'fixed' ? 'Fixed' : 'Adhoc'} Type` : '';

    if (range && typeStr) {
      return `Period: ${range} (${typeStr})`;
    } else if (range) {
      return `Period: ${range}`;
    } else if (typeStr) {
      return typeStr;
    }
    return '';
  }, [startDate, endDate, vehicleType]);

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    setProjectId("");
    setLocationId("");
    setVehicleType("");
  };

  const createInvoiceMutation = useCreateVendorInvoice();
  const pdfRef = useRef<HTMLDivElement>(null)
  const annexurePdfRef = useRef<HTMLDivElement>(null)

  const getInvoiceHtmlContent = (element: HTMLElement | null, title: string = 'Vendor Invoice', isLandscape: boolean = false) => {
    if (!element) return '';

    const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    const stylesHtml = styleElements.map(el => el.outerHTML).join('\n');

    let cssStyles = '';
    try {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          cssStyles += rules.map(r => r.cssText).join('\n') + '\n';
        } catch (e) {
          // Ignore cross-origin stylesheet errors if any
        }
      }
    } catch (e) {
      console.error('Error reading stylesheets', e);
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          ${stylesHtml}
          <style>
            ${cssStyles}
            *, ::before, ::after { box-sizing: border-box; }
            body { 
              background: white !important; 
              margin: 0; 
              padding: 20px; 
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
            }
            .bg-yellow-300 { background-color: #fde047 !important; }
            .border-black { border-color: #000000 !important; }
            .grid { display: grid !important; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            .flex { display: flex !important; }
            .flex-1 { flex: 1 1 0% !important; }
            .flex-col { flex-direction: column !important; }
            .justify-between { justify-content: space-between !important; }
            .justify-center { justify-content: center !important; }
            .justify-end { justify-content: flex-end !important; }
            .items-center { align-items: center !important; }
            .relative { position: relative !important; }
            .absolute { position: absolute !important; }
            .text-center { text-align: center !important; }
            .text-right { text-align: right !important; }
            .text-left { text-align: left !important; }
            .font-bold { font-weight: 700 !important; }
            .font-medium { font-weight: 500 !important; }
            .font-normal { font-weight: 400 !important; }
            .underline { text-decoration: underline !important; }
            .line-through { text-decoration: line-through !important; }
            table { width: 100%; border-collapse: collapse !important; }
            @media print {
              @page { size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'}; margin: 5mm; }
              body { padding: 0; margin: 0; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              table { page-break-inside: auto; }
              tr    { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <div style="width: 100%; ${isLandscape ? '' : 'max-width: 900px;'} margin: 0 auto; ${isLandscape ? 'zoom: 0.75;' : 'zoom: 0.85;'}">
            ${element.innerHTML}
          </div>
        </body>
      </html>
    `;
  };

  const handleDownloadAnnexurePDF = () => {
    if (!annexurePdfRef.current) return;
    const htmlContent = getInvoiceHtmlContent(annexurePdfRef.current, 'Annexure', true);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
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
    const htmlContent = getInvoiceHtmlContent(pdfRef.current, 'Vendor Invoice', false);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
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

  const handleDownloadAll = async () => {
    if (!vendorTrips) return;

    // ── Sheet 1: Annexure ───────────────────────────────────────────────────
    let annexureRows: any[][] = [];
    if (vehicleType === "adhoc") {
      annexureRows = [
        ["S. No.", "Location", "No Of Trips", "Rates", "Extra KM", "Extra KM Rate", "Extra Hrs Rate", "Fixed Cost", "Extra KM Cost", "DCM Charges", "Total Amount"],
        ...(vendorTrips.misData || []).map((r: any) => [
          r.id, r.location, r.noOfTrips, r.rates, r.extraKm, r.extraKmRate, r.extraHrsRate, r.fixedCost, r.extraKmCost, r.dcmCharges, r.totalAmount
        ])
      ];
    } else {
      annexureRows = [
        ["S.No.", "Vehicle Number", "Type of Vehicle", "Mode", "Location", "Vertical", "No. of hours", "Fixed Kms", "Agreement Rate", "Diesel Hike", "Total Charges with Diesel Hike", "Nos. of Working days", "Nos of days actual done", "Total KMs", "Extra Hour Amount", "Extra Hour", "Extra Hours Rate", "Extra KM rate", "Dynamic Fuel incr", "Extra KM Rate D", "Per Day Cost", "Per Day KM Conside", "Actual Deployed Days", "Extra Km", "Extra Km Charge", "Total Amount", "Toll charges", "DCM Charges", "Final Amount"],
        ...(vendorTrips.misData || []).map((r: any) => [
          r.id, r.vehNo, r.vehType, r.mode, r.loc, r.vertical, r.hrs, r.fixedKms, r.agRate, r.dieselHike, r.totWithHike, r.workDays, r.actualDays, r.totKms, r.extHrAmt, r.extHr, r.extHrRate, r.extKmRate, r.dynFuel, r.totExtKmRate, r.perDayCost, r.perDayKm, r.actualDeployed, r.extKm, r.extKmCharge, r.totalAmt, r.toll, r.dcm, r.finalAmt
        ])
      ];
    }

    // ── Sheet 2: MIS ────────────────────────────────────────────────────────
    let misRows: any[][] = [];
    if (vehicleType === "adhoc") {
      misRows = [
        ["Date", "Hub Name", "Billing Location", "Vendor", "Vehicle Number", "Vehicle Type", "Parent Vehicle", "Vehicle Ownership Type", "Driver Type", "In Time", "Out Time", "Start Odometer", "End Odometer", "Distance", "Extra Km"],
        ...(vendorTrips.annexureData || []).map((r: any) => [
          r.date, r.hub, r.loc, r.vendor, r.vehNo, r.vehType, r.parentVeh, r.ownType, r.driverType, r.inTime, r.outTime, r.startOdo, r.endOdo, r.dist, r.extraKm
        ])
      ];
    } else {
      misRows = [
        ["Date", "Hub Name", "Billing Location", "Vendor", "Vehicle Number", "Vehicle Type", "Parent Vehicle", "Vehicle Ownership Type", "Driver Type", "In Time", "Out Time", "Start Odometer", "End Odometer", "Distance"],
        ...(vendorTrips.annexureData || []).map((r: any) => [
          r.date, r.hub, r.loc, r.vendor, r.vehNo, r.vehType, r.parentVeh, r.ownType, r.driverType, r.inTime, r.outTime, r.startOdo, r.endOdo, r.dist
        ])
      ];
    }

    const totalAmt = (vendorTrips?.misData || []).reduce((acc: number, row: any) => {
      const rowVal = parseFloat(row.totalAmount ?? row.finalAmt ?? row.totalAmt ?? '0');
      return acc + (isNaN(rowVal) ? 0 : rowVal);
    }, 0);

    const vendorNameStr = vendorTrips?.vendorInfo?.VendorName || vendors?.find((v: any) => v.id.toString() === vendorId)?.name || 'Vendor Company Name and Vendor Name';
    const vendorAddressStr = vendorTrips?.vendorInfo?.VendorAddress || 'Vendor Address and Contact Details';
    const vendorGSTINStr = vendorTrips?.vendorInfo?.GSTIN || '';

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

    const invNum = nextInvoiceNumData?.invoiceNumber || 'VN/26-27/001';

    const blob = await generateVendorInvoiceExcel({
      invoiceNumber: invNum,
      invoiceDate: issueDate || new Date().toISOString().split('T')[0],
      startDate,
      endDate,
      vehicleType,
      locationName: locStr,
      vendorName: vendorNameStr,
      vendorAddress: vendorAddressStr,
      vendorGSTIN: vendorGSTINStr,
      costCode: costCode || '4477',
      totalAmount: isNaN(totalAmt) ? 0 : Number(totalAmt.toFixed(2)),
      bankDetails: {
        accountHolderName: vendorTrips?.vendorInfo?.AccountHolderName || vendorNameStr,
        bankName: vendorTrips?.vendorInfo?.BankName || "",
        accountNumber: vendorTrips?.vendorInfo?.AccountNumber || "",
        ifscCode: vendorTrips?.vendorInfo?.IFSCCode || "",
        branchName: vendorTrips?.vendorInfo?.BranchName || "",
      },
      annexureRows: annexureRows.length > 0 ? annexureRows : undefined,
      misRows: misRows.length > 0 ? misRows : undefined,
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Vendor_Invoice_${vendorNameStr.replace(/\s+/g, '_')}_${invNum.replace(/\//g, '-')}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleNext = async () => {
    if (step === "details") {
      const misCount = vendorTrips?.misData?.length ?? 0;
      const annexCount = vendorTrips?.annexureData?.length ?? 0;
      if (misCount === 0 && annexCount === 0) {
        setNoDataModalOpen(true);
        return;
      }
      setStep("cards");
    } else if (step === "cards") {
      setStep("mis");
    } else if (step === "mis") {
      setStep("annexure");
    } else if (step === "annexure") {
      setStep("preview");
    } else if (step === "preview") {
      // Final submit
      try {
        setIsSubmitting(true);
        const rawTotal = (vendorTrips?.misData || []).reduce((acc: number, row: any) => {
          const rowVal = parseFloat(row.totalAmount ?? row.finalAmt ?? row.totalAmt ?? '0');
          return acc + (isNaN(rowVal) ? 0 : rowVal);
        }, 0);
        const amount = isNaN(rawTotal) ? 0 : Number(rawTotal.toFixed(2));
        const vendorNameStr = vendorTrips?.vendorInfo?.VendorName || vendors?.find(v => v.id.toString() === vendorId)?.name || 'Unknown Vendor';

        const htmlPayload = pdfRef.current ? getInvoiceHtmlContent(pdfRef.current, 'Vendor Invoice', false) : undefined;

        const res = await createInvoiceMutation.mutateAsync({
          vendorName: vendorNameStr,
          amount: amount,
          linkedCustomerInvoice: linkedInvoice,
          financialYear: '26-27',
          html: htmlPayload,
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });

        if (res?.azureBlobUrl) {
          window.open(res.azureBlobUrl, '_blank');
        }

        if (onCancel) onCancel(); // Close screen
      } catch (error) {
        console.error("Failed to save vendor invoice", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handlePrev = () => {
    if (step === "preview" || step === "annexure" || step === "mis") {
      setStep("cards");
    } else if (step === "cards") {
      setStep("details");
    } else {
      if (onCancel) onCancel();
    }
  };

  const handleExportCSV = async () => {
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

    const formattedData = dataToExport.map((row: any) =>
      keys.map((k) => {
        let val = row[k];
        if (k === "date" && val) {
          return new Date(val).toLocaleDateString("en-GB");
        }
        return val ?? "";
      })
    );

    await exportTableToExcel({
      sheetName: step === "mis" ? "MIS" : "Annexure",
      headers: labels,
      data: formattedData,
      fileName: `Vendor_Invoice_${step === "mis" ? "MIS" : "Annexure"}_${vehicleType}.xlsx`,
    });
  };

  return (
    <div className="flex-1 pb-8">
      {/* Header matching Create Invoice */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handlePrev}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Create Vendor Invoice</h2>
            <p className="text-muted-foreground mt-1 font-medium">
              {dynamicSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-2xl border border-border/60 shadow-sm select-none">
          <button
            type="button"
            disabled={!vendorTrips}
            onClick={() => vendorTrips && setStep("mis")}
            className={`px-6 py-2.5 text-base font-semibold rounded-xl transition-all ${
              step === "mis"
                ? "bg-blue-600 text-white shadow-md"
                : vendorTrips
                ? "text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                : "text-muted-foreground/30 cursor-not-allowed"
            }`}
          >
            MIS
          </button>
          <button
            type="button"
            disabled={!vendorTrips}
            onClick={() => vendorTrips && setStep("annexure")}
            className={`px-6 py-2.5 text-base font-semibold rounded-xl transition-all ${
              step === "annexure"
                ? "bg-blue-600 text-white shadow-md"
                : vendorTrips
                ? "text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                : "text-muted-foreground/30 cursor-not-allowed"
            }`}
          >
            Annexure
          </button>
          <button
            type="button"
            disabled={!vendorTrips}
            onClick={() => vendorTrips && setStep("preview")}
            className={`px-6 py-2.5 text-base font-semibold rounded-xl transition-all ${
              step === "preview"
                ? "bg-blue-600 text-white shadow-md"
                : vendorTrips
                ? "text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                : "text-muted-foreground/30 cursor-not-allowed"
            }`}
          >
            Invoice
          </button>
        </div>
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

          {step === "cards" && (
            <div className="py-8 px-6">
              {/* Header with Title and Download Button */}
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
                  onClick={() => setStep("mis")}
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
                  onClick={() => setStep("annexure")}
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
                  onClick={() => setStep("preview")}
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

          {(step === "mis" || step === "annexure") && (
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">{step === "mis" ? "MIS Report" : "Annexure"}</h3>
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
                      <div className="flex-1 p-1 pl-2">: {nextInvoiceNumData?.invoiceNumber || 'VN/26-27/001'}</div>
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

          {step !== "cards" && (
            <div className="flex justify-between items-center mt-8 pt-6 border-t">
              <Button variant="outline" onClick={handlePrev}>
                {step === "details" ? "Cancel" : "← Back"}
              </Button>

              <div className="flex items-center gap-4">
                {step === "preview" && (
                  <>
                    <Button variant="outline" onClick={handleDownloadPDF}>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button variant="outline" onClick={handleDownloadAll} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300">
                      <Download className="mr-2 h-4 w-4 text-emerald-600" />
                      Download Excel
                    </Button>
                  </>
                )}
                <Button
                  className="bg-blue-600 text-white hover:bg-blue-700 font-semibold px-6"
                  onClick={handleNext}
                  disabled={(step === "details" && (!vehicleType || !vendorId || !customerId || !projectId)) || isTripsLoading || isSubmitting}
                >
                  {(isTripsLoading || isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Saving..." : step === "details" ? "Proceed" : step === "preview" ? "Submit" : "Next"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
              <span className="font-semibold text-foreground">Vendor:</span>
              <span>{selectedVendor?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Customer:</span>
              <span>{selectedCustomer?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Project:</span>
              <span>{selectedProject?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Type & Period:</span>
              <span>{vehicleType || '—'} ({startDate || '—'} to {endDate || '—'})</span>
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

