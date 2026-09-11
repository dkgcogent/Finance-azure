import ExcelJS from "exceljs";

export interface BankChargeExportRow {
  head: string;
  apr: string | number | null;
  may: string | number | null;
  jun: string | number | null;
  jul: string | number | null;
  aug: string | number | null;
  sep: string | number | null;
  oct: string | number | null;
  nov: string | number | null;
  dec: string | number | null;
  jan: string | number | null;
  feb: string | number | null;
  mar: string | number | null;
  total: string | number | null;
}

export interface BankChargesExportParams {
  financialYear: string;
  data: BankChargeExportRow[];
  totals: Record<string, number>;
  monthHeaders: string[]; // e.g. ["Apr-26", "May-26", ..., "Mar-27"]
  moduleType?: "budget" | "actual";
  sheetName?: string;
  fileName?: string;
}

const MONTH_KEYS = ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar'] as const;

const parseVal = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined || val === "-") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  return parseFloat(String(val).replace(/,/g, "").replace(/%/g, "")) || 0;
};

export async function exportBankChargesExcel({
  financialYear,
  data,
  totals,
  monthHeaders,
  moduleType = "actual",
  sheetName,
  fileName
}: BankChargesExportParams) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Finance System";
  wb.created = new Date();

  const titlePrefix = moduleType === "budget" ? "Budget Bank Charges" : "Actual Bank Charges";
  const wsName = sheetName || `Bank Charges FY ${financialYear}`;

  const ws = wb.addWorksheet(wsName, {
    views: [
      {
        state: "frozen",
        xSplit: 1,
        ySplit: 1,
        activeCell: "B2",
        showGridLines: true
      }
    ],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  });

  const totalCols = 1 + monthHeaders.length + 1; // Col 1: Head, Cols 2-13: Months, Col 14: Total

  // --- Palette & Borders ---
  const BORDER_THIN: ExcelJS.Border = { style: "thin", color: { argb: "FFCBD5E1" } };
  const BORDER_DOUBLE: ExcelJS.Border = { style: "double", color: { argb: "FF475569" } };

  const ALL_THIN_BORDERS: Partial<ExcelJS.Borders> = {
    top: BORDER_THIN,
    bottom: BORDER_THIN,
    left: BORDER_THIN,
    right: BORDER_THIN
  };

  // Setup Column Widths
  ws.getColumn(1).width = 38; // Head column
  for (let c = 2; c <= totalCols - 1; c++) {
    ws.getColumn(c).width = 15; // Month columns
  }
  ws.getColumn(totalCols).width = 18; // Total column

  // --- Row 1: Header Row ---
  const headerRow = ws.getRow(1);
  headerRow.height = 28;

  // Col 1: Head Header
  const headHeaderCell = headerRow.getCell(1);
  headHeaderCell.value = "Head / Bank Charge";
  headHeaderCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  headHeaderCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  headHeaderCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" } // Deep Slate 900
  };
  headHeaderCell.border = ALL_THIN_BORDERS;

  // Cols 2-13: Month Headers
  monthHeaders.forEach((label, idx) => {
    const colNum = 2 + idx;
    const cell = headerRow.getCell(colNum);
    cell.value = label;
    cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: idx % 2 === 0 ? "FF1E293B" : "FF334155" }
    };
    cell.border = ALL_THIN_BORDERS;
  });

  // Col 14: Total Header
  const totalHeaderCell = headerRow.getCell(totalCols);
  totalHeaderCell.value = "Total (₹)";
  totalHeaderCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  totalHeaderCell.alignment = { vertical: "middle", horizontal: "center" };
  totalHeaderCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" }
  };
  totalHeaderCell.border = ALL_THIN_BORDERS;

  // --- Data Rows (Row 2 onwards) ---
  data.forEach((rowItem, rIdx) => {
    const excelRowNum = 2 + rIdx;
    const row = ws.getRow(excelRowNum);
    row.height = 22;

    const rowBg = rIdx % 2 === 1 ? "FFF8FAFC" : "FFFFFFFF";

    // Col 1: Head Cell
    const headCell = row.getCell(1);
    headCell.value = rowItem.head;
    headCell.font = { name: "Calibri", size: 10, bold: false, color: { argb: "FF0F172A" } };
    headCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    headCell.border = ALL_THIN_BORDERS;
    headCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };

    // Cols 2-13: Month Values
    let calculatedRowTotal = 0;
    MONTH_KEYS.forEach((mKey, mIdx) => {
      const colNum = 2 + mIdx;
      const numVal = parseVal(rowItem[mKey]);
      calculatedRowTotal += numVal;

      const cell = row.getCell(colNum);
      cell.value = numVal;
      cell.numFmt = "#,##,##0;[Red]-#,##,##0;\"0\"";
      cell.font = { name: "Calibri", size: 9.5 };
      cell.alignment = { vertical: "middle", horizontal: "right" };
      cell.border = ALL_THIN_BORDERS;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    });

    // Col 14: Total Cell
    const totalVal = rowItem.total !== null && rowItem.total !== undefined ? parseVal(rowItem.total) : calculatedRowTotal;
    const totalCell = row.getCell(totalCols);
    totalCell.value = totalVal;
    totalCell.numFmt = "#,##,##0;[Red]-#,##,##0;\"0\"";
    totalCell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
    totalCell.alignment = { vertical: "middle", horizontal: "right" };
    totalCell.border = ALL_THIN_BORDERS;
    totalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  });

  // --- Grand Total Row ---
  const grandTotalRowNum = 2 + data.length;
  const grandTotalRow = ws.getRow(grandTotalRowNum);
  grandTotalRow.height = 24;

  const GRAND_TOTAL_FILL: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFEF08A" } // Soft Yellow Accent (matching UI)
  };

  // Col 1: Grand Total Label
  const gtHeadCell = grandTotalRow.getCell(1);
  gtHeadCell.value = "Grand Total";
  gtHeadCell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FF0F172A" } };
  gtHeadCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  gtHeadCell.border = { ...ALL_THIN_BORDERS, bottom: BORDER_DOUBLE };
  gtHeadCell.fill = GRAND_TOTAL_FILL;

  // Cols 2-13: Monthly Totals
  MONTH_KEYS.forEach((mKey, mIdx) => {
    const colNum = 2 + mIdx;
    const cell = grandTotalRow.getCell(colNum);
    const mTotal = totals[mKey] || 0;
    cell.value = mTotal;
    cell.numFmt = "#,##,##0;[Red]-#,##,##0;\"0\"";
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
    cell.alignment = { vertical: "middle", horizontal: "right" };
    cell.border = { ...ALL_THIN_BORDERS, bottom: BORDER_DOUBLE };
    cell.fill = GRAND_TOTAL_FILL;
  });

  // Col 14: Grand Total Amount
  const gtTotalCell = grandTotalRow.getCell(totalCols);
  gtTotalCell.value = totals.total || 0;
  gtTotalCell.numFmt = "#,##,##0;[Red]-#,##,##0;\"0\"";
  gtTotalCell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FF0F172A" } };
  gtTotalCell.alignment = { vertical: "middle", horizontal: "right" };
  gtTotalCell.border = { ...ALL_THIN_BORDERS, bottom: BORDER_DOUBLE };
  gtTotalCell.fill = GRAND_TOTAL_FILL;

  // Write & Download in Browser
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const finalFileName = fileName || (moduleType === "budget" ? `Bank_Charges_Budget_${financialYear}.xlsx` : `Bank_Charges_Actual_${financialYear}.xlsx`);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = finalFileName.endsWith(".xlsx") ? finalFileName : `${finalFileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
