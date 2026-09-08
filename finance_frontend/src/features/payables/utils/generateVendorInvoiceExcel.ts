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

// Outer frame for a row across columns c1 to c2
function outerRow(
  ws: ExcelJS.Worksheet,
  r: number,
  c1: number,
  c2: number,
  top = false,
  bottom = false,
  w: "thin" | "medium" = "thin"
) {
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

// Indian comma format: 11,32,596.00
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function fmtDate(d?: string): string {
  if (!d) return "";
  const dt = new Date(d);
  if (!isNaN(dt.getTime())) {
    return `${dt.getDate()}-${MONTHS[dt.getMonth()]}-${dt.getFullYear()}`;
  }
  return d;
}

// ─── Params Interface ────────────────────────────────────────────────────────
export interface VendorInvoiceExcelParams {
  invoiceNumber: string;
  invoiceDate?: string;
  startDate?: string;
  endDate?: string;
  vehicleType?: string;
  locationName?: string;
  vendorName?: string;
  vendorAddress?: string;
  vendorGSTIN?: string;
  addressOfCompany?: string;
  costCode?: string;
  totalAmount: number;
  bankDetails?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branchName?: string;
  };
  annexureRows?: any[][];
  misRows?: any[][];
}

// ─── Main Generator Function ─────────────────────────────────────────────────
export async function generateVendorInvoiceExcel(params: VendorInvoiceExcelParams): Promise<Blob> {
  const {
    invoiceNumber,
    invoiceDate = new Date().toISOString().split("T")[0],
    startDate,
    endDate,
    vehicleType = "fixed",
    locationName = "UP",
    vendorName = "Vendor Company Name and Vendor Name",
    vendorAddress = "Vendor Address and Contact Details",
    vendorGSTIN = "",
    addressOfCompany = "",
    costCode = "4477",
    totalAmount,
    bankDetails = {},
    annexureRows,
    misRows,
  } = params;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Invoice", { views: [{ showGridLines: false }] });

  // ── Columns: A(pad) B(S.No) C(HSN) D-E(Description) F(CostCode) G(Total) H(pad)
  ws.columns = [
    { width: 2 },   // col 1 = A (left padding)
    { width: 10 },  // col 2 = B (S No)
    { width: 14 },  // col 3 = C (HSN / Metadata label)
    { width: 22 },  // col 4 = D (Description part 1 / Metadata val)
    { width: 20 },  // col 5 = E (Description part 2 / Right side label)
    { width: 14 },  // col 6 = F (Cost Code / Right side label/boundary)
    { width: 16 },  // col 7 = G (Total / Amounts)
    { width: 2 },   // col 8 = H (right padding)
  ];

  // ── Row Heights ────────────────────────────────────────────────────────────
  const rh = (r: number, h: number) => { ws.getRow(r).height = h; };

  // R1-R3: Header
  rh(1, 26);
  rh(2, 18);
  rh(3, 10);

  // R4: BILL OF SUPPLY
  rh(4, 20);

  // R5-R7: Metadata Grid
  rh(5, 18);
  rh(6, 18);
  rh(7, 18);

  // R8-R14: Invoice To / For (Place of Supply)
  for (let r = 8; r <= 14; r++) rh(r, 15);

  // R15-R16: Article Description
  rh(15, 18);
  rh(16, 28);

  // R17-R19: Spacers
  rh(17, 8); rh(18, 8); rh(19, 8);

  // R20: Table Header
  rh(20, 18);

  // R21: Data Row
  rh(21, 18);

  // R22-R23: Blank table rows
  rh(22, 14);
  rh(23, 14);

  // R24: Table Total
  rh(24, 18);

  // R25-R26: Blank spacer
  rh(25, 8); rh(26, 8);

  // R27: Bank Header
  rh(27, 18);

  // R28-R32: Bank details
  for (let r = 28; r <= 32; r++) rh(r, 16);

  // R33: Blank spacer
  rh(33, 8);

  // R34-R37: Amount in Words & Total
  rh(34, 18);
  rh(35, 16);
  rh(36, 16);
  rh(37, 16);

  // R38-R40: Signatory
  rh(38, 16);
  rh(39, 28);
  rh(40, 16);

  // R41-R42: Note
  rh(41, 16);
  rh(42, 16);

  // =========================================================================
  // SECTION 1: HEADER (R1–R3) - Yellow Background
  // =========================================================================
  const YELLOW_FILL: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFFF00" }, // Bright yellow matching the Bill of Supply header
  };

  for (let r = 1; r <= 3; r++) {
    for (let c = 2; c <= 7; c++) {
      G(ws, r, c).fill = YELLOW_FILL;
    }
  }

  // Row 1: Vendor Name
  merge(ws, 1, 2, 1, 7);
  v(ws, 1, 2, vendorName);
  font(ws, 1, 2, { bold: true, size: 14, color: { argb: "FF000000" }, name: "Calibri" });
  aln(ws, 1, 2, "center", "middle");

  // Row 2: Vendor Address
  merge(ws, 2, 2, 2, 7);
  v(ws, 2, 2, vendorAddress);
  font(ws, 2, 2, { size: 10, color: { argb: "FF000000" }, name: "Calibri" });
  aln(ws, 2, 2, "center", "middle");

  // Outer frame for header (R1-R3)
  outerRow(ws, 1, 2, 7, true, false, "medium");
  outerRow(ws, 2, 2, 7, false, false, "medium");
  outerRow(ws, 3, 2, 7, false, true, "medium");

  // =========================================================================
  // SECTION 2: BILL OF SUPPLY (R4)
  // =========================================================================
  merge(ws, 4, 2, 4, 7);
  v(ws, 4, 2, "BILL OF SUPPLY");
  font(ws, 4, 2, { bold: true, size: 12, underline: true, name: "Calibri" });
  aln(ws, 4, 2, "center", "middle");
  outerRow(ws, 4, 2, 7, true, true, "medium");

  // =========================================================================
  // SECTION 3: INVOICE METADATA GRID (R5–R7)
  // Left: B (label), C-D (value) | Right: E-F (label), G (value)
  // =========================================================================
  const metaRows: [string, string, string, string][] = [
    ["Invoice No.", `: ${invoiceNumber}`, "Date", `: ${fmtDate(invoiceDate) || fmtDate(endDate)}`],
    ["Our GSTIN", `: ${vendorGSTIN || ""}`, "Invoice Under RCM", ": No"],
    ["Service Category", ": Transportation", "Customer PO No.", ": Agreement"],
  ];

  metaRows.forEach(([l1, val1, l2, val2], i) => {
    const r = 5 + i;

    // Col B: Label 1
    v(ws, r, 2, l1);
    font(ws, r, 2, { bold: true, size: 10, name: "Calibri" });
    aln(ws, r, 2, "left", "middle");
    fb(ws, r, 2);

    // Cols C-D: Val 1
    merge(ws, r, 3, r, 4);
    v(ws, r, 3, val1);
    font(ws, r, 3, { size: 10, name: "Calibri" });
    aln(ws, r, 3, "left", "middle");
    for (let c = 3; c <= 4; c++) fb(ws, r, c);

    // Cols E-F: Label 2
    merge(ws, r, 5, r, 6);
    v(ws, r, 5, l2);
    font(ws, r, 5, { bold: true, size: 10, name: "Calibri" });
    aln(ws, r, 5, "left", "middle");
    for (let c = 5; c <= 6; c++) fb(ws, r, c);

    // Col G: Val 2
    v(ws, r, 7, val2);
    font(ws, r, 7, { size: 10, name: "Calibri" });
    aln(ws, r, 7, "left", "middle");
    fb(ws, r, 7);

    // Medium side borders
    G(ws, r, 2).border = { ...G(ws, r, 2).border, left: MED };
    G(ws, r, 7).border = { ...G(ws, r, 7).border, right: MED };
  });

  // Top/bottom border on metadata block
  for (let c = 2; c <= 7; c++) {
    G(ws, 5, c).border = { ...G(ws, 5, c).border, top: MED };
    G(ws, 7, c).border = { ...G(ws, 7, c).border, bottom: MED };
  }

  // =========================================================================
  // SECTION 4: INVOICE TO (B-D) & INVOICE FOR / PLACE OF SUPPLY (E-G) (R8–R14)
  // =========================================================================
  // R8: Subheaders
  merge(ws, 8, 2, 8, 4);
  v(ws, 8, 2, "Invoice To :-   GSTIN - 07AAFCC4715N1Z");
  font(ws, 8, 2, { bold: true, size: 10, underline: true, name: "Calibri" });
  aln(ws, 8, 2, "left", "middle");

  merge(ws, 8, 5, 8, 7);
  v(ws, 8, 5, "Invoice For/ Place Of Supply :-");
  font(ws, 8, 5, { bold: true, size: 10, underline: true, name: "Calibri" });
  aln(ws, 8, 5, "left", "middle");

  // R9-R14: Addresses for Cogent Logistics Private Limited
  const defaultAddrLine1 = "201C/6, 2nd Floor, D-21 Corporate Park,";
  const defaultAddrLine2 = "Sector 21, Dwarka, New Delhi - 110077";

  let addrL1 = defaultAddrLine1;
  let addrL2 = defaultAddrLine2;

  if (addressOfCompany && addressOfCompany.trim().length > 0) {
    const rawParts = addressOfCompany.split(',').map(s => s.trim()).filter(Boolean);
    if (rawParts.length >= 4) {
      const half = Math.ceil(rawParts.length / 2);
      addrL1 = rawParts.slice(0, half).join(', ') + ',';
      addrL2 = rawParts.slice(half).join(', ');
    } else {
      addrL1 = addressOfCompany.trim();
      addrL2 = "";
    }
  }

  const leftLines = [
    "Cogent Logistics Private Limited",
    addrL1,
    addrL2,
    "", "", "",
  ];
  const rightLines = [
    "Cogent Logistics Private Limited",
    addrL1,
    addrL2,
    "", "", "",
  ];

  for (let i = 0; i < 6; i++) {
    const r = 9 + i;
    merge(ws, r, 2, r, 4);
    if (leftLines[i]) {
      v(ws, r, 2, leftLines[i]);
      font(ws, r, 2, { bold: i === 0, size: 10, name: "Calibri" });
      aln(ws, r, 2, "left", "middle");
    }

    merge(ws, r, 5, r, 7);
    if (rightLines[i]) {
      v(ws, r, 5, rightLines[i]);
      font(ws, r, 5, { bold: i === 0, size: 10, name: "Calibri" });
      aln(ws, r, 5, "left", "middle");
    }
  }

  // Borders for R8-R14
  for (let r = 8; r <= 14; r++) {
    for (let c = 2; c <= 7; c++) {
      G(ws, r, c).border = {
        top: r === 8 ? MED : undefined,
        bottom: r === 14 ? MED : undefined,
        left: c === 2 ? MED : (c === 5 ? MED : undefined),
        right: c === 7 ? MED : (c === 4 ? MED : undefined),
      };
    }
  }

  // =========================================================================
  // SECTION 5: ARTICLE DESCRIPTION (R15–R16)
  // =========================================================================
  merge(ws, 15, 2, 15, 7);
  v(ws, 15, 2, "Article Description");
  font(ws, 15, 2, { bold: true, size: 10, name: "Calibri" });
  aln(ws, 15, 2, "center", "middle");
  outerRow(ws, 15, 2, 7, true, true, "medium");

  // Format period description
  let periodStr = "";
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const startMonth = FULL_MONTHS[start.getMonth()];
      const endMonth = FULL_MONTHS[end.getMonth()];
      const year = end.getFullYear();
      periodStr = `for the Period Of ${getOrdinal(start.getDate())} ${startMonth} to ${getOrdinal(end.getDate())} ${endMonth} ${year}`;
    }
  }

  const tripTypeStr = vehicleType.toLowerCase() === "fixed" ? "Fix" : "Adhoc";
  const descText = `${tripTypeStr} Transportation Charges ${locationName} ${periodStr} (as per annexure attached)`;

  merge(ws, 16, 2, 16, 7);
  v(ws, 16, 2, descText);
  font(ws, 16, 2, { bold: true, size: 10, name: "Calibri" });
  aln(ws, 16, 2, "center", "middle", true);
  outerRow(ws, 16, 2, 7, false, true, "medium");

  // R17-R19: Blank spacer
  for (let r = 17; r <= 19; r++) {
    G(ws, r, 2).border = { left: MED };
    G(ws, r, 7).border = { right: MED };
  }

  // =========================================================================
  // SECTION 6: ITEMS TABLE (R20–R24)
  // =========================================================================
  // R20: Column headers
  const headers = [
    { c: 2, t: "S No" },
    { c: 3, t: "HSN/SAC" },
    { c: 4, t: "Description", span: 2 },
    { c: 6, t: "Cost Code" },
    { c: 7, t: "Total" },
  ];

  headers.forEach(({ c, t, span }) => {
    if (span) merge(ws, 20, c, 20, c + span - 1);
    v(ws, 20, c, t);
    font(ws, 20, c, { bold: true, size: 10, name: "Calibri" });
    aln(ws, 20, c, "center", "middle");
    for (let ci = c; ci < c + (span || 1); ci++) fb(ws, 20, ci);
  });
  G(ws, 20, 2).border = { ...G(ws, 20, 2).border, top: MED, left: MED };
  G(ws, 20, 7).border = { ...G(ws, 20, 7).border, top: MED, right: MED };
  for (let c = 3; c <= 6; c++) G(ws, 20, c).border = { ...G(ws, 20, c).border, top: MED };

  // R21: Data row
  v(ws, 21, 2, 1);
  font(ws, 21, 2, { size: 10, name: "Calibri" });
  aln(ws, 21, 2, "center", "middle");
  fb(ws, 21, 2);

  v(ws, 21, 3, "996601");
  font(ws, 21, 3, { size: 10, name: "Calibri" });
  aln(ws, 21, 3, "center", "middle");
  fb(ws, 21, 3);

  merge(ws, 21, 4, 21, 5);
  v(ws, 21, 4, "Transportation Charges");
  font(ws, 21, 4, { size: 10, name: "Calibri" });
  aln(ws, 21, 4, "center", "middle");
  for (let c = 4; c <= 5; c++) fb(ws, 21, c);

  v(ws, 21, 6, costCode);
  font(ws, 21, 6, { size: 10, name: "Calibri" });
  aln(ws, 21, 6, "center", "middle");
  fb(ws, 21, 6);

  v(ws, 21, 7, totalAmount);
  nfmt(ws, 21, 7, "#,##0.00");
  font(ws, 21, 7, { size: 10, name: "Calibri" });
  aln(ws, 21, 7, "right", "middle");
  fb(ws, 21, 7);

  G(ws, 21, 2).border = { ...G(ws, 21, 2).border, left: MED };
  G(ws, 21, 7).border = { ...G(ws, 21, 7).border, right: MED };

  // R22 & R23: Blank spacer rows in table
  for (let r of [22, 23]) {
    fb(ws, r, 2);
    fb(ws, r, 3);
    merge(ws, r, 4, r, 5);
    for (let c = 4; c <= 5; c++) fb(ws, r, c);
    fb(ws, r, 6);
    fb(ws, r, 7);
    G(ws, r, 2).border = { ...G(ws, r, 2).border, left: MED };
    G(ws, r, 7).border = { ...G(ws, r, 7).border, right: MED };
  }

  // R24: Total row
  fb(ws, 24, 2);
  fb(ws, 24, 3);
  merge(ws, 24, 4, 24, 5);
  for (let c = 4; c <= 5; c++) fb(ws, 24, c);

  v(ws, 24, 6, "Total");
  font(ws, 24, 6, { bold: true, size: 10, name: "Calibri" });
  aln(ws, 24, 6, "center", "middle");
  fb(ws, 24, 6);

  v(ws, 24, 7, totalAmount);
  nfmt(ws, 24, 7, "#,##0.00");
  font(ws, 24, 7, { bold: true, size: 10, name: "Calibri" });
  aln(ws, 24, 7, "right", "middle");
  fb(ws, 24, 7);

  G(ws, 24, 2).border = { ...G(ws, 24, 2).border, left: MED, bottom: MED };
  G(ws, 24, 3).border = { ...G(ws, 24, 3).border, bottom: MED };
  G(ws, 24, 4).border = { ...G(ws, 24, 4).border, bottom: MED };
  G(ws, 24, 5).border = { ...G(ws, 24, 5).border, bottom: MED };
  G(ws, 24, 6).border = { ...G(ws, 24, 6).border, bottom: MED };
  G(ws, 24, 7).border = { ...G(ws, 24, 7).border, right: MED, bottom: MED };

  // R25-R26: Blank spacer
  for (let r = 25; r <= 26; r++) {
    G(ws, r, 2).border = { left: MED };
    G(ws, r, 7).border = { right: MED };
  }

  // =========================================================================
  // SECTION 7: BANK DETAILS (R27–R32)
  // =========================================================================
  merge(ws, 27, 2, 27, 7);
  v(ws, 27, 2, "Our Bank Details :-");
  font(ws, 27, 2, { bold: true, size: 10, underline: true, name: "Calibri" });
  aln(ws, 27, 2, "left", "middle");
  outerRow(ws, 27, 2, 7, true, true, "medium");

  const bankRows: [string, string][] = [
    ["Account Holder Name", bankDetails.accountHolderName || vendorName || ""],
    ["Bank Name", bankDetails.bankName || ""],
    ["Account No.", bankDetails.accountNumber || ""],
    ["IFSC Code", bankDetails.ifscCode || ""],
    ["Branch", bankDetails.branchName || ""],
  ];

  bankRows.forEach(([lbl, val], i) => {
    const r = 28 + i;

    // Col B-C: Label
    merge(ws, r, 2, r, 3);
    v(ws, r, 2, lbl);
    font(ws, r, 2, { bold: true, size: 10, name: "Calibri" });
    aln(ws, r, 2, "left", "middle");
    for (let c = 2; c <= 3; c++) fb(ws, r, c);

    // Col D-G: Value
    merge(ws, r, 4, r, 7);
    v(ws, r, 4, val);
    font(ws, r, 4, { size: 10, name: "Calibri" });
    aln(ws, r, 4, "left", "middle");
    for (let c = 4; c <= 7; c++) fb(ws, r, c);

    G(ws, r, 2).border = { ...G(ws, r, 2).border, left: MED };
    G(ws, r, 7).border = { ...G(ws, r, 7).border, right: MED };
  });

  for (let c = 2; c <= 7; c++) {
    G(ws, 32, c).border = { ...G(ws, 32, c).border, bottom: MED };
  }

  // R33: Blank spacer
  G(ws, 33, 2).border = { left: MED };
  G(ws, 33, 7).border = { right: MED };

  // =========================================================================
  // SECTION 8: AMOUNT IN WORDS + TOTAL (R34–R37)
  // Left: B-D (Amount in words), Right: E-F (Total label), G (Total value)
  // =========================================================================
  // Left side: Label on R34
  merge(ws, 34, 2, 34, 4);
  v(ws, 34, 2, "Amount in Words :");
  font(ws, 34, 2, { bold: true, size: 10, name: "Calibri" });
  aln(ws, 34, 2, "left", "middle");
  G(ws, 34, 2).border = { top: MED, left: MED };
  for (let c = 3; c <= 4; c++) G(ws, 34, c).border = { top: MED, right: c === 4 ? THIN : undefined };

  // Words text (R35-R37)
  merge(ws, 35, 2, 37, 4);
  const words = numberToWords(Math.round(totalAmount));
  v(ws, 35, 2, `${words} Rupees Only`);
  G(ws, 35, 2).alignment = { horizontal: "left", vertical: "top", wrapText: true };
  font(ws, 35, 2, { size: 10, name: "Calibri" });
  for (let r = 35; r <= 37; r++) {
    for (let c = 2; c <= 4; c++) {
      G(ws, r, c).border = {
        bottom: r === 37 ? MED : undefined,
        left: c === 2 ? MED : undefined,
        right: c === 4 ? THIN : undefined,
      };
    }
  }

  // Right side: Total (R34)
  merge(ws, 34, 5, 34, 6);
  v(ws, 34, 5, "Total");
  font(ws, 34, 5, { bold: true, size: 10, name: "Calibri" });
  aln(ws, 34, 5, "center", "middle");
  for (let c = 5; c <= 6; c++) fb(ws, 34, c);
  G(ws, 34, 5).border = { ...G(ws, 34, 5).border, top: MED };
  G(ws, 34, 6).border = { ...G(ws, 34, 6).border, top: MED };

  v(ws, 34, 7, totalAmount);
  nfmt(ws, 34, 7, "#,##0.00");
  font(ws, 34, 7, { bold: true, size: 10, name: "Calibri" });
  aln(ws, 34, 7, "right", "middle");
  fb(ws, 34, 7);
  G(ws, 34, 7).border = { ...G(ws, 34, 7).border, top: MED, right: MED };

  // Blank right side (R35-R37)
  for (let r = 35; r <= 37; r++) {
    merge(ws, r, 5, r, 6);
    for (let c = 5; c <= 6; c++) fb(ws, r, c);
    fb(ws, r, 7);
    G(ws, r, 7).border = { ...G(ws, r, 7).border, right: MED };
    if (r === 37) {
      for (let c = 5; c <= 7; c++) G(ws, 37, c).border = { ...G(ws, 37, c).border, bottom: MED };
    }
  }

  // =========================================================================
  // SECTION 9: SIGNATORY (R38–R40)
  // =========================================================================
  merge(ws, 38, 2, 38, 7);
  v(ws, 38, 2, "For Cogent Logistics Private Limited");
  font(ws, 38, 2, { bold: true, size: 10, name: "Calibri" });
  aln(ws, 38, 2, "right", "middle");
  outerRow(ws, 38, 2, 7, true, false, "medium");

  // R39: Blank for signature
  G(ws, 39, 2).border = { left: MED };
  G(ws, 39, 7).border = { right: MED };

  // R40: Authorised Signatory
  merge(ws, 40, 2, 40, 7);
  v(ws, 40, 2, "Authorised Signatory");
  font(ws, 40, 2, { size: 10, name: "Calibri" });
  aln(ws, 40, 2, "right", "middle");
  outerRow(ws, 40, 2, 7, false, true, "medium");

  // =========================================================================
  // SECTION 10: GST EXEMPTION NOTE (R41–R42)
  // =========================================================================
  merge(ws, 41, 2, 42, 7);
  v(
    ws,
    41,
    2,
    "Note: Under this invoice,we are providing services by way of transportation of goods by road to a Goods Transportation Agency. Services provided by us are exempted from payment of GST as per notification issued by Govt."
  );
  font(ws, 41, 2, { size: 9, italic: true, name: "Calibri" });
  aln(ws, 41, 2, "center", "middle", true);
  outerRow(ws, 41, 2, 7, true, false, "medium");
  outerRow(ws, 42, 2, 7, false, true, "medium");

  // =========================================================================
  // SHEET 2: ANNEXURE
  // =========================================================================
  if (annexureRows && annexureRows.length > 0) {
    const wsA = wb.addWorksheet("Annexure", { views: [{ showGridLines: true }] });
    const [headerRow, ...dataRows] = annexureRows;
    const aHeaderRow = wsA.addRow(headerRow);
    aHeaderRow.height = 26;
    aHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF000000" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
      cell.border = { top: THIN, bottom: THIN, left: THIN, right: THIN };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });

    dataRows.forEach((row) => {
      const r = wsA.addRow(row);
      r.height = 20;
      r.eachCell((cell) => {
        cell.font = { size: 10, name: "Calibri", color: { argb: "FF000000" } };
        cell.border = { top: THIN, bottom: THIN, left: THIN, right: THIN };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
    });

    headerRow.forEach((h: any, idx: number) => {
      let maxLen = String(h || "").length;
      dataRows.forEach((r) => {
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
    mHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF000000" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
      cell.border = { top: THIN, bottom: THIN, left: THIN, right: THIN };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });

    misData.forEach((row) => {
      const r = wsM.addRow(row);
      r.height = 20;
      r.eachCell((cell) => {
        cell.font = { size: 10, name: "Calibri", color: { argb: "FF000000" } };
        cell.border = { top: THIN, bottom: THIN, left: THIN, right: THIN };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
    });

    misHeader.forEach((h: any, idx: number) => {
      let maxLen = String(h || "").length;
      misData.forEach((r) => {
        const val = r[idx];
        const valLen = val !== null && val !== undefined ? String(val).length : 0;
        if (valLen > maxLen) maxLen = valLen;
      });
      wsM.getColumn(idx + 1).width = Math.min(35, Math.max(12, maxLen + 3));
    });
  }

  // ── Output buffer ──────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
