import ExcelJS from "exceljs";
import { numberToWords } from "@/lib/utils";

// ─── Border constants ────────────────────────────────────────────────────────
const THIN: ExcelJS.Border = { style: "thin", color: { argb: "FF000000" } };
const MED: ExcelJS.Border = { style: "medium", color: { argb: "FF000000" } };

// ─── Helpers ─────────────────────────────────────────────────────────────────
const G = (ws: ExcelJS.Worksheet, r: number, c: number) => ws.getCell(r, c);

function v(ws: ExcelJS.Worksheet, r: number, c: number, val: ExcelJS.CellValue) {
  G(ws, r, c).value = val;
}
function merge(ws: ExcelJS.Worksheet, r1: number, c1: number, r2: number, c2: number) {
  ws.mergeCells(r1, c1, r2, c2);
}
function font(ws: ExcelJS.Worksheet, r: number, c: number, opts: Partial<ExcelJS.Font>) {
  G(ws, r, c).font = opts as ExcelJS.Font;
}
function aln(
  ws: ExcelJS.Worksheet, r: number, c: number,
  h: "left" | "center" | "right" = "left",
  va: "top" | "middle" | "bottom" = "middle",
  wrap = false
) {
  G(ws, r, c).alignment = { horizontal: h, vertical: va, wrapText: wrap };
}
function nfmt(ws: ExcelJS.Worksheet, r: number, c: number, fmt: string) {
  G(ws, r, c).numFmt = fmt;
}

// Full 4-side border
function fb(ws: ExcelJS.Worksheet, r: number, c: number, w: "thin" | "medium" = "thin") {
  const b = w === "medium" ? MED : THIN;
  G(ws, r, c).border = { top: b, bottom: b, left: b, right: b };
}

// Partial border helper
function pb(
  ws: ExcelJS.Worksheet, r: number, c: number,
  sides: { T?: boolean; B?: boolean; L?: boolean; R?: boolean },
  w: "thin" | "medium" = "thin"
) {
  const b = w === "medium" ? MED : THIN;
  G(ws, r, c).border = {
    top: sides.T ? b : undefined,
    bottom: sides.B ? b : undefined,
    left: sides.L ? b : undefined,
    right: sides.R ? b : undefined,
  };
}

// Row of cells top+bottom+left(first)+right(last) borders — outer frame of a merged row
function outerRow(ws: ExcelJS.Worksheet, r: number, c1: number, c2: number, top = false, bottom = false, w: "thin" | "medium" = "thin") {
  const b = w === "medium" ? MED : THIN;
  for (let c = c1; c <= c2; c++) {
    G(ws, r, c).border = {
      top: top ? b : undefined,
      bottom: bottom ? b : undefined,
      left: c === c1 ? b : undefined,
      right: c === c2 ? b : undefined,
    };
  }
}

// Indian comma format: 13,21,864.42
function fmtIndian(n: number, decimals = 2): string {
  const fixed = n.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const formatted = rest
    ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
    : lastThree;
  return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
}

// Date from YYYY-MM-DD to DD-Month-YYYY
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(d?: string): string {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) {
      return `${dt.getDate()}-${MONTHS[dt.getMonth()]}-${dt.getFullYear()}`;
    }
  }
  return d;
}

// ─── Params ───────────────────────────────────────────────────────────────────
export interface InvoiceExcelParams {
  invoiceNumber: string;
  invoiceDate: string;
  startDate: string;
  endDate: string;
  invoiceType: string;
  invoiceLocation: string;
  customerName: string;
  customerCompanyName?: string;
  customerAddress?: string;
  customerDetails?: any;
  serviceCategory?: string;
  customerGSTIN: string;
  typeOfBilling?: string;
  isRCM?: boolean;
  gstRate?: string | number;
  costCode: string;
  projectName: string;
  totalFreight: number;
  isInterState: boolean;
  logoBuffer?: ArrayBuffer;       // optional: raw bytes of the logo PNG
  annexureRows?: any[][];         // optional: Annexure sheet rows (header + data)
  misRows?: any[][];              // optional: MIS sheet rows (header + data)
}

// ─── Main ────────────────────────────────────────────────────────────────────
export async function generateInvoiceExcel(params: InvoiceExcelParams): Promise<Blob> {
  const {
    invoiceNumber, invoiceDate, startDate, endDate,
    invoiceType, invoiceLocation, customerName, customerCompanyName, customerAddress, customerDetails, serviceCategory, customerGSTIN,
    typeOfBilling, isRCM: propsIsRCM, gstRate,
    costCode, projectName, totalFreight, isInterState, logoBuffer,
    annexureRows, misRows,
  } = params;

  // Determine RCM & Tax
  const isRCM = propsIsRCM ?? (String(typeOfBilling || '').trim().toUpperCase() === 'RCM' || String(typeOfBilling || '').trim().toUpperCase().includes('RCM'));
  const gstRatePercent = isRCM ? 0 : (gstRate !== undefined && gstRate !== null && gstRate !== '' ? parseFloat(String(gstRate)) : 18);
  const totalTax = isRCM ? 0 : totalFreight * (gstRatePercent / 100);
  const grandTotal = Math.round(totalFreight + totalTax);
  const igst  = isInterState && !isRCM ? totalTax : 0;
  const cgst  = !isInterState && !isRCM ? totalTax / 2 : 0;
  const sgst  = !isInterState && !isRCM ? totalTax / 2 : 0;

  const period = (startDate && endDate)
    ? `${fmtDate(startDate)} to ${fmtDate(endDate)}`
    : "";
  const cleanLocation = invoiceLocation ? invoiceLocation.split("-")[0].trim() : "";
  const tripTypeLabel = invoiceType === "Fixed" ? "Fix" : "Adhoc";
  const description = `${tripTypeLabel} Transportation Charges ${projectName} ${cleanLocation} for the Period Of ${period} (as per annexure attached)`;

  const isUP = isInterState;
  const isHaryana = invoiceLocation?.toLowerCase().includes("hary") || invoiceLocation?.toLowerCase().includes("gurugram");

  // Resolve Customer Company Name
  const rawCompanyName = customerCompanyName || customerDetails?.companyName || (customerName ? customerName.split(" (")[0].trim() : "");
  const displayCompanyName = rawCompanyName
    ? (rawCompanyName.trim().toLowerCase().startsWith("m/s") ? rawCompanyName.trim() : `M/s ${rawCompanyName.trim()}`)
    : (isUP ? "M/s Instakart Services Pvt Ltd" : "M/s Instakart Services Private Limited");

  // Customer address based on TMS master data
  let invoiceTo: string;
  let invoiceFor: string;

  if (customerDetails) {
    const line1 = [customerDetails.houseFlatNo, customerDetails.streetLocality].filter(Boolean).map((s: any) => String(s).trim()).filter(Boolean).join(", ");
    const line2 = [customerDetails.city, customerDetails.state ? (customerDetails.pinCode ? `${customerDetails.state} ${customerDetails.pinCode}` : customerDetails.state) : customerDetails.pinCode].filter(Boolean).map((s: any) => String(s).trim()).filter(Boolean).join(", ");
    const line3 = customerDetails.country && customerDetails.country !== "India" ? String(customerDetails.country).trim() : "";
    const addrLines = [displayCompanyName, line1?.toUpperCase(), line2?.toUpperCase(), line3?.toUpperCase()].filter(Boolean);
    invoiceTo = addrLines.join(",\n");
    invoiceFor = addrLines.join(",\n");
  } else if (customerAddress) {
    invoiceTo = `${displayCompanyName},\n${customerAddress.toUpperCase()}`;
    invoiceFor = `${displayCompanyName},\n${customerAddress.toUpperCase()}`;
  } else if (isUP) {
    invoiceTo = "M/s Instakart Services Pvt Ltd,\nKHASRA NO. 1132, UNITED WORLD WAREHOUSE, NEAR CRPF CAMP BIJNAUR, VILLAGE MATI, LUCKNOW,\nUTTAR PRADESH, 226002";
    invoiceFor = "M/s Instakart Services Pvt Ltd,\nKHASRA NO. 1132, UNITED WORLD WAREHOUSE, NEAR CRPF CAMP BIJNAUR, VILLAGE MATI, LUCKNOW,\nUTTAR PRADESH, 226002";
  } else if (isHaryana) {
    invoiceTo = "M/s Instakart Services Private Limited,\n219/15, BOHRAKALAN, WARD NO. 67, TEH. PATAUDI,\nGURGAON, HARYANA - 122413";
    invoiceFor = "M/s Instakart Services Private Limited,\n219/15, BOHRAKALAN, WARD NO. 67, TEH. PATAUDI,\nGURGAON, HARYANA - 122413";
  } else {
    invoiceTo = "M/s Instrakart Services Pvt Ltd,\nPLOT NO 36/3 AND 37 BAMNOLI VILLAGE,\nDELHI, WEST DELHI, DELHI - 110077";
    invoiceFor = "M/s Instrakart Services Pvt Ltd,\nPLOT NO 36/3 AND 37 BAMNOLI VILLAGE,\nDELHI, WEST DELHI, DELHI - 110077";
  }

  // ── Build workbook ──────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Invoice", { views: [{ showGridLines: false }] });

  // Columns: A(pad) B(S.No) C(HSN) D-E(Description) F(CostCode) G(Total) H(pad)
  // We use cols 1-8 (A-H):
  //   A=pad(2), B=10, C=10, D=18, E=18, F=12, G=14, H=pad(2)
  ws.columns = [
    { width: 2 },   // col 1 = A (left padding)
    { width: 10 },  // col 2 = B (S No)
    { width: 12 },  // col 3 = C (HSN)
    { width: 22 },  // col 4 = D (Description part 1)
    { width: 20 },  // col 5 = E (Description part 2 / right half)
    { width: 14 },  // col 6 = F (Cost Code / left-right boundary)
    { width: 16 },  // col 7 = G (Total / amounts)
    { width: 2 },   // col 8 = H (right padding)
  ];

  // ── ROW HEIGHTS ─────────────────────────────────────────────────────────────
  const rh = (r: number, h: number) => { ws.getRow(r).height = h; };

  // R1-R4: Header
  rh(1, 30); rh(2, 18); rh(3, 14); rh(4, 14);

  // R5: blank spacer
  rh(5, 6);

  // R6: TAX INVOICE
  rh(6, 18);

  // R7-R9: Invoice metadata
  rh(7, 16); rh(8, 16); rh(9, 16);

  // R10-R16: Invoice To / For (7 rows)
  for (let r = 10; r <= 16; r++) rh(r, 15);

  // R17-R18: Article Description
  rh(17, 16); rh(18, 28);

  // R19-R21: blank + spacer
  rh(19, 8); rh(20, 8); rh(21, 8);

  // R22: Column headers
  rh(22, 16);

  // R23: data row
  rh(23, 16);

  // R24: blank
  rh(24, 12);

  // R25: blank
  rh(25, 12);

  // R26: Total row
  rh(26, 16);

  // R27-R29: blank spacer
  rh(27, 10); rh(28, 10); rh(29, 10);

  // R30: "Our Bank Details"
  rh(30, 15);

  // R31-R35: bank rows
  for (let r = 31; r <= 35; r++) rh(r, 14);

  // R36: blank spacer
  rh(36, 10);

  // R37-R41: Amount in Words + Tax Summary
  rh(37, 15); rh(38, 15); rh(39, 15); rh(40, 15); rh(41, 15);

  // R42-R44: Signatory
  rh(42, 14); rh(43, 28); rh(44, 14);

  // =========================================================================
  // SECTION 1: HEADER (R1–R4) & R5
  // =========================================================================

  // ── Outer frame for header (R1-R5) ──────────────────────────────────────
  outerRow(ws, 1, 2, 7, true, false, "medium");
  outerRow(ws, 2, 2, 7, false, false, "medium");
  outerRow(ws, 3, 2, 7, false, false, "medium");
  outerRow(ws, 4, 2, 7, false, false, "medium");
  outerRow(ws, 5, 2, 7, false, false, "medium");

  // ── Logo image (B1:B2) ──────────────────────────────────────────────────
  if (logoBuffer) {
    const logoId = wb.addImage({ buffer: logoBuffer, extension: "png" });
    ws.addImage(logoId, {
      tl: { col: 1.02, row: 0.05 },
      br: { col: 3.25, row: 2.25 },
      editAs: "oneCell",
    } as any);
  } else {
    // Fallback text logo (if no image buffer provided)
    v(ws, 1, 2, "cogentes");
    font(ws, 1, 2, { bold: true, size: 20, color: { argb: "FF0070C0" }, italic: true, name: "Calibri" });
    aln(ws, 1, 2, "left", "middle");
  }

  // Company name (B1:G1 merged, center-aligned across the full invoice frame)
  merge(ws, 1, 2, 1, 7);
  v(ws, 1, 2, "Cogent Logistics Private Limited");
  font(ws, 1, 2, { bold: true, size: 14, color: { argb: "FF1F3864" }, name: "Calibri" });
  aln(ws, 1, 2, "center", "middle");

  // CIN (B2:G2 merged, center-aligned across the full invoice frame)
  merge(ws, 2, 2, 2, 7);
  v(ws, 2, 2, "CIN No.: U63040DL2013PTC260297");
  aln(ws, 2, 2, "center", "middle");
  font(ws, 2, 2, { size: 10, name: "Calibri" });

  // Address (B3:G3)
  merge(ws, 3, 2, 3, 7);
  v(ws, 3, 2, "201C/6, 2nd Floor, D-21 Corporate Park, Sector 21, Dwarka, New Delhi - 110077");
  aln(ws, 3, 2, "center", "middle");
  font(ws, 3, 2, { size: 10, name: "Calibri" });

  // Email/web/phone (B4:G4)
  merge(ws, 4, 2, 4, 7);
  v(ws, 4, 2, "E mail: info@cogentlogistics.in   Web: www.cogentlogistics.in   Phone: +91 11 41099971");
  aln(ws, 4, 2, "center", "middle");
  font(ws, 4, 2, { size: 10, name: "Calibri" });

  // =========================================================================
  // SECTION 2: TAX INVOICE (R6)
  // =========================================================================
  merge(ws, 6, 2, 6, 7);
  v(ws, 6, 2, "TAX INVOICE");
  font(ws, 6, 2, { bold: true, size: 11, underline: true, name: "Calibri" });
  aln(ws, 6, 2, "center", "middle");
  outerRow(ws, 6, 2, 7, true, true, "medium");

  // =========================================================================
  // SECTION 3: INVOICE METADATA GRID (R7–R9)
  // =========================================================================

  const resolvedServiceCategory = 
    serviceCategory || 
    customerDetails?.typeOfServices || 
    "Transportation";

  const metaRows: [string, string, string, string][] = [
    ["Invoice No.", `: ${invoiceNumber}`, "Date", `: ${fmtDate(invoiceDate) || fmtDate(endDate)}`],
    ["Our GSTIN", ": 07AAFCC4715N1ZG", "Invoice Under RCM", `: ${isRCM ? 'Yes' : 'No'}`],
    ["Service Category", `: ${resolvedServiceCategory}`, "Customer PO No.", ": Agreement"],
  ];

  metaRows.forEach(([l1, val1, l2, val2], i) => {
    const r = 7 + i;

    // Left label: B (single col)
    v(ws, r, 2, l1);
    font(ws, r, 2, { bold: true, size: 10, name: "Calibri" });
    aln(ws, r, 2, "left", "middle");
    G(ws, r, 2).border = { top: THIN, bottom: THIN, left: MED, right: THIN };

    // Left value: C-D merged
    merge(ws, r, 3, r, 4);
    v(ws, r, 3, val1);
    font(ws, r, 3, { size: 10, name: "Calibri" });
    aln(ws, r, 3, "left", "middle");
    G(ws, r, 3).border = { top: THIN, bottom: THIN, left: THIN };
    G(ws, r, 4).border = { top: THIN, bottom: THIN, right: THIN };

    // Right label: E
    v(ws, r, 5, l2);
    font(ws, r, 5, { bold: true, size: 10, name: "Calibri" });
    aln(ws, r, 5, "left", "middle");
    G(ws, r, 5).border = { top: THIN, bottom: THIN, left: THIN, right: THIN };

    // Right value: F-G merged
    merge(ws, r, 6, r, 7);
    v(ws, r, 6, val2);
    font(ws, r, 6, { size: 10, name: "Calibri" });
    aln(ws, r, 6, "left", "middle");
    G(ws, r, 6).border = { top: THIN, bottom: THIN, left: THIN };
    G(ws, r, 7).border = { top: THIN, bottom: THIN, right: MED };
  });

  // =========================================================================
  // SECTION 4: INVOICE TO / FOR (R10–R16)
  // Left: B-D merged (Invoice To block)
  // Right: E-G merged (Invoice For block)
  // =========================================================================

  // Invoice To (left: cols B-D, rows 10-16)
  merge(ws, 10, 2, 16, 4);
  v(ws, 10, 2, `Invoice To :-            GSTIN - ${customerGSTIN}\n${invoiceTo}`);
  G(ws, 10, 2).alignment = { vertical: "top", wrapText: true };
  font(ws, 10, 2, { bold: true, size: 10, name: "Calibri" });
  for (let r = 10; r <= 16; r++) {
    for (let c = 2; c <= 4; c++) {
      G(ws, r, c).border = {
        top: r === 10 ? MED : undefined,
        bottom: r === 16 ? MED : undefined,
        left: c === 2 ? MED : undefined,
        right: c === 4 ? MED : undefined,
      };
    }
  }

  // Invoice For (right: cols E-G, rows 10-16)
  merge(ws, 10, 5, 16, 7);
  v(ws, 10, 5, `Invoice For/ Place Of Supply :-\n\n${invoiceFor}`);
  G(ws, 10, 5).alignment = { vertical: "top", wrapText: true };
  font(ws, 10, 5, { bold: true, size: 10, name: "Calibri" });
  for (let r = 10; r <= 16; r++) {
    for (let c = 5; c <= 7; c++) {
      G(ws, r, c).border = {
        top: r === 10 ? MED : undefined,
        bottom: r === 16 ? MED : undefined,
        left: c === 5 ? MED : undefined,
        right: c === 7 ? MED : undefined,
      };
    }
  }

  // =========================================================================
  // SECTION 5: ARTICLE DESCRIPTION (R17–R18)
  // =========================================================================

  // Header row: "Article Description" centered, bold
  merge(ws, 17, 2, 17, 7);
  v(ws, 17, 2, "Article Description");
  font(ws, 17, 2, { bold: true, size: 10, name: "Calibri" });
  aln(ws, 17, 2, "center", "middle");
  outerRow(ws, 17, 2, 7, true, true, "thin");

  // Description text row
  merge(ws, 18, 2, 18, 7);
  v(ws, 18, 2, `         ${description}`);
  font(ws, 18, 2, { bold: true, size: 10, name: "Calibri" });
  aln(ws, 18, 2, "left", "middle", true);
  outerRow(ws, 18, 2, 7, false, true, "thin");

  // =========================================================================
  // SECTION 6: LINE ITEMS TABLE (R19–R26)
  // R19-R21: blank spacer rows (with side borders)
  // R22: headers (S No | HSN | Description | Cost Code | Total)
  // R23: data row
  // R24-R25: blank rows
  // R26: Total row
  // =========================================================================

  // Blank spacer with side borders
  for (let r = 19; r <= 21; r++) {
    merge(ws, r, 2, r, 7);
    outerRow(ws, r, 2, 7, false, false, "thin");
    G(ws, r, 2).border = {
      left: MED,
      right: MED,
    };
  }

  // R22: Column headers
  // B: S No, C: HSN, D-E: Description, F: Cost Code, G: Total
  const colDefs: [number, number, string, "center" | "left" | "right"][] = [
    [2, 2, "S No", "center"],
    [3, 3, "HSN", "center"],
    [4, 5, "Description", "center"],
    [6, 6, "Cost Code", "center"],
    [7, 7, "Total", "center"],
  ];
  for (const [cs, ce, label, halign] of colDefs) {
    if (cs !== ce) merge(ws, 22, cs, 22, ce);
    v(ws, 22, cs, label);
    font(ws, 22, cs, { bold: true, size: 10, name: "Calibri" });
    aln(ws, 22, cs, halign, "middle");
    for (let c = cs; c <= ce; c++) fb(ws, 22, c);
  }

  // R23: Data row
  v(ws, 23, 2, 1);
  aln(ws, 23, 2, "center", "middle");
  fb(ws, 23, 2);

  v(ws, 23, 3, "996819");
  aln(ws, 23, 3, "center", "middle");
  fb(ws, 23, 3);

  merge(ws, 23, 4, 23, 5);
  v(ws, 23, 4, "Transportation Charges");
  aln(ws, 23, 4, "center", "middle");
  pb(ws, 23, 4, { T: true, B: true, L: true });
  pb(ws, 23, 5, { T: true, B: true, R: true });

  v(ws, 23, 6, costCode || "4462");
  aln(ws, 23, 6, "center", "middle");
  fb(ws, 23, 6);

  v(ws, 23, 7, totalFreight);
  nfmt(ws, 23, 7, "#,##0.00");
  aln(ws, 23, 7, "right", "middle");
  fb(ws, 23, 7);

  // R24-R25: blank rows with column borders
  for (let r = 24; r <= 25; r++) {
    for (let c = 2; c <= 7; c++) {
      G(ws, r, c).border = {
        left: c === 2 ? MED : THIN,
        right: c === 7 ? MED : undefined,
        top: undefined,
        bottom: c === 6 || c === 7 ? THIN : undefined,
      };
    }
  }

  // R26: Total row — "Total" label in F, amount in G
  for (let c = 2; c <= 5; c++) {
    G(ws, 26, c).border = { left: c === 2 ? MED : undefined, bottom: MED };
  }
  v(ws, 26, 6, "Total");
  font(ws, 26, 6, { size: 10, name: "Calibri" });
  aln(ws, 26, 6, "right", "middle");
  G(ws, 26, 6).border = { top: THIN, bottom: MED, left: THIN, right: THIN };

  v(ws, 26, 7, totalFreight);
  nfmt(ws, 26, 7, "#,##0.00");
  aln(ws, 26, 7, "right", "middle");
  G(ws, 26, 7).border = { top: THIN, bottom: MED, left: THIN, right: MED };

  // =========================================================================
  // SECTION 7: BLANK SPACER (R27–R29)
  // =========================================================================
  for (let r = 27; r <= 29; r++) {
    G(ws, r, 2).border = { left: MED };
    G(ws, r, 7).border = { right: MED };
  }

  // =========================================================================
  // SECTION 8: BANK DETAILS (R30–R35)
  // =========================================================================

  // "Our Bank Details :-" label (row 30, col B only)
  v(ws, 30, 2, "Our Bank Details :-");
  font(ws, 30, 2, { bold: true, size: 10, name: "Calibri" });
  aln(ws, 30, 2, "left", "middle");
  G(ws, 30, 2).border = { top: MED, left: MED };
  for (let c = 3; c <= 7; c++) G(ws, 30, c).border = { top: MED, right: c === 7 ? MED : undefined };

  // Bank data rows (R31-R35): col B = label, cols C-G = value (merged)
  const bankRows: [string, string][] = [
    ["Account Holder Name", "Cogent Logistics Private Limited"],
    ["Bank Name", "ICICI Bank"],
    ["Account No.", "163951000002"],
    ["IFSC Code", "ICIC0001639"],
    ["Branch", "Pankaj Arcade, Shop no 3,4,5,6 plot no 5 MLU Sec 11 Dwarka, New Delhi -110075"],
  ];
  bankRows.forEach(([label, val], i) => {
    const r = 31 + i;
    v(ws, r, 2, label);
    font(ws, r, 2, { size: 10, name: "Calibri" });
    aln(ws, r, 2, "left", "middle");
    fb(ws, r, 2);

    merge(ws, r, 3, r, 7);
    v(ws, r, 3, val);
    font(ws, r, 3, { size: 10, name: "Calibri" });
    aln(ws, r, 3, "center", "middle");
    for (let c = 3; c <= 7; c++) fb(ws, r, c);
  });

  // =========================================================================
  // SECTION 9: BLANK SPACER (R36)
  // =========================================================================
  G(ws, 36, 2).border = { left: MED };
  G(ws, 36, 7).border = { right: MED };

  // =========================================================================
  // SECTION 10: AMOUNT IN WORDS + TAX SUMMARY (R37–R41)
  // Left: B-D (Amount in Words label R37, text R38-R41)
  // Right: E-F (label), G (value) for each tax row
  // =========================================================================

  // Left side: "Amount in Words :" label on R37
  v(ws, 37, 2, "Amount in Words :");
  font(ws, 37, 2, { bold: true, size: 10, name: "Calibri" });
  aln(ws, 37, 2, "left", "middle");
  G(ws, 37, 2).border = { top: MED, left: MED };
  for (let c = 3; c <= 4; c++) G(ws, 37, c).border = { top: MED, right: c === 4 ? THIN : undefined };

  // Words text (R38-R41, left B-D)
  merge(ws, 38, 2, 41, 4);
  const words = numberToWords(grandTotal);
  v(ws, 38, 2, `${words} Rupees Only`);
  G(ws, 38, 2).alignment = { horizontal: "left", vertical: "top", wrapText: true };
  font(ws, 38, 2, { size: 10, name: "Calibri" });
  for (let r = 38; r <= 41; r++) {
    for (let c = 2; c <= 4; c++) {
      G(ws, r, c).border = {
        bottom: r === 41 ? MED : undefined,
        left: c === 2 ? MED : undefined,
        right: c === 4 ? THIN : undefined,
      };
    }
  }

  // Right side: tax rows (R37-R41), cols E-F = label, G = value
  const igstLabel = isRCM ? "IGST" : `IGST@${gstRatePercent}%`;
  const cgstLabel = isRCM ? "CGST" : `CGST@${gstRatePercent / 2}%`;
  const sgstLabel = isRCM ? "SGST" : `SGST@${gstRatePercent / 2}%`;

  const taxRowData: [string, number | null, boolean][] = [
    ["Sub Total Before Tax", totalFreight, false],
    [igstLabel, isInterState && !isRCM && igst > 0 ? igst : null, false],
    [cgstLabel, !isInterState && !isRCM && cgst > 0 ? cgst : null, false],
    [sgstLabel, !isInterState && !isRCM && sgst > 0 ? sgst : null, false],
    ["Grand Total After Tax", grandTotal, true],
  ];
  taxRowData.forEach(([label, val, isBold], i) => {
    const r = 37 + i;

    merge(ws, r, 5, r, 6);
    v(ws, r, 5, label);
    font(ws, r, 5, { bold: isBold, size: 10, name: "Calibri" });
    aln(ws, r, 5, "center", "middle");
    for (let c = 5; c <= 6; c++) fb(ws, r, c);

    if (val !== null && val !== 0) {
      v(ws, r, 7, val);
      nfmt(ws, r, 7, "#,##0.00");
      font(ws, r, 7, { bold: isBold, size: 10, name: "Calibri" });
      aln(ws, r, 7, "right", "middle");
    }
    fb(ws, r, 7);
  });

  // =========================================================================
  // SECTION 11: SIGNATORY (R42–R44)
  // =========================================================================

  // R42: "For Cogent Logistics Private Limited" (centered, bold)
  merge(ws, 42, 2, 42, 7);
  v(ws, 42, 2, "For Cogent Logistics Private Limited");
  font(ws, 42, 2, { bold: true, size: 10, name: "Calibri" });
  aln(ws, 42, 2, "center", "middle");
  outerRow(ws, 42, 2, 7, true, false, "medium");

  // R43: blank (signature space)
  G(ws, 43, 2).border = { left: MED };
  G(ws, 43, 7).border = { right: MED };

  // R44: "Authorised Signatory"
  merge(ws, 44, 2, 44, 7);
  v(ws, 44, 2, "Authorised Signatory");
  font(ws, 44, 2, { size: 10, name: "Calibri" });
  aln(ws, 44, 2, "center", "middle");
  outerRow(ws, 44, 2, 7, false, true, "medium");

  // =========================================================================
  // =========================================================================
  // SHEET 2: ANNEXURE
  // =========================================================================
  if (annexureRows && annexureRows.length > 0) {
    const wsA = wb.addWorksheet("Annexure", { views: [{ showGridLines: true }] });
    const [headerRow, ...dataRows] = annexureRows;
    const aHeaderRow = wsA.addRow(headerRow);
    aHeaderRow.height = 26;
    aHeaderRow.eachCell(cell => {
      cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF000000" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
      cell.border = { top: THIN, bottom: THIN, left: THIN, right: THIN };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
    dataRows.forEach(row => {
      const r = wsA.addRow(row);
      r.height = 20;
      r.eachCell(cell => {
        cell.font = { size: 10, name: "Calibri", color: { argb: "FF000000" } };
        cell.border = { top: THIN, bottom: THIN, left: THIN, right: THIN };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
    });
    headerRow.forEach((h: any, idx: number) => {
      let maxLen = String(h || "").length;
      dataRows.forEach(r => {
        const val = r[idx];
        const valLen = val !== null && val !== undefined ? String(val).length : 0;
        if (valLen > maxLen) maxLen = valLen;
      });
      wsA.getColumn(idx + 1).width = Math.min(35, Math.max(12, maxLen + 3));
    });
  }

  // =========================================================================
  // SHEET 3: MIS
  // =========================================================================
  if (misRows && misRows.length > 0) {
    const wsM = wb.addWorksheet("MIS", { views: [{ showGridLines: true }] });
    const [misHeader, ...misData] = misRows;
    const mHeaderRow = wsM.addRow(misHeader);
    mHeaderRow.height = 26;
    mHeaderRow.eachCell(cell => {
      cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF000000" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
      cell.border = { top: THIN, bottom: THIN, left: THIN, right: THIN };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
    misData.forEach(row => {
      const r = wsM.addRow(row);
      r.height = 20;
      r.eachCell(cell => {
        cell.font = { size: 10, name: "Calibri", color: { argb: "FF000000" } };
        cell.border = { top: THIN, bottom: THIN, left: THIN, right: THIN };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
    });
    misHeader.forEach((h: any, idx: number) => {
      let maxLen = String(h || "").length;
      misData.forEach(r => {
        const val = r[idx];
        const valLen = val !== null && val !== undefined ? String(val).length : 0;
        if (valLen > maxLen) maxLen = valLen;
      });
      wsM.getColumn(idx + 1).width = Math.min(35, Math.max(12, maxLen + 3));
    });
  }

  // ── Output: single workbook with all sheets ───────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
