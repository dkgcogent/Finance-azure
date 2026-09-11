import ExcelJS from "exceljs";

export interface DepreciationExportRow {
  category: string;
  assetName: string;
  depPercentage?: string | number | null;
  purchaseDate?: string | null;
  purchaseValue?: string | number | null;
  openingDate?: string | null;
  wdvOpeningValue?: string | number | null;
  apr?: string | number | null;
  may?: string | number | null;
  jun?: string | number | null;
  jul?: string | number | null;
  aug?: string | number | null;
  sep?: string | number | null;
  oct?: string | number | null;
  nov?: string | number | null;
  dec?: string | number | null;
  jan?: string | number | null;
  feb?: string | number | null;
  mar?: string | number | null;
  [key: string]: any;
}

export interface DepreciationExportParams {
  financialYear: string;
  data: DepreciationExportRow[];
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

export async function exportDepreciationExcel({
  financialYear,
  data,
  totals,
  monthHeaders,
  moduleType = "budget",
  sheetName,
  fileName
}: DepreciationExportParams) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Finance System";
  wb.created = new Date();

  const wsName = sheetName || `Depreciation FY ${financialYear}`;
  const ws = wb.addWorksheet(wsName, {
    views: [
      {
        state: "frozen",
        xSplit: 2,
        ySplit: 1,
        activeCell: "C2",
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

  // Columns:
  // 1: Category, 2: Asset Name, 3: Dep %, 4: Purchase Date, 5: Purchase Value, 6: Opening Date, 7: WDV Opening Value
  // 8..19: Months (12)
  // 20: Total Dep, 21: WDV Closing Value
  const staticHeaders = [
    { label: "Category", width: 22, align: "left" as const },
    { label: "Asset Name", width: 26, align: "left" as const },
    { label: "Dep %", width: 12, align: "center" as const },
    { label: "Purchase Date", width: 16, align: "center" as const },
    { label: "Purchase Value (₹)", width: 20, align: "right" as const },
    { label: "Opening Date", width: 16, align: "center" as const },
    { label: "WDV Opening Value (₹)", width: 22, align: "right" as const }
  ];

  const totalCols = staticHeaders.length + monthHeaders.length + 2;

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
  staticHeaders.forEach((sh, idx) => {
    ws.getColumn(idx + 1).width = sh.width;
  });

  monthHeaders.forEach((_, idx) => {
    ws.getColumn(staticHeaders.length + 1 + idx).width = 15;
  });

  ws.getColumn(totalCols - 1).width = 18; // Total Dep
  ws.getColumn(totalCols).width = 22;     // WDV Closing

  // --- Row 1: Header Row ---
  const headerRow = ws.getRow(1);
  headerRow.height = 28;

  // Static Headers (1..7)
  staticHeaders.forEach((sh, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = sh.label;
    cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: sh.align };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" } // Deep Slate 900
    };
    cell.border = ALL_THIN_BORDERS;
  });

  // Month Headers (8..19)
  monthHeaders.forEach((label, idx) => {
    const colNum = staticHeaders.length + 1 + idx;
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

  // Total Dep Header
  const totalDepHeader = headerRow.getCell(totalCols - 1);
  totalDepHeader.value = "Total Dep (₹)";
  totalDepHeader.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
  totalDepHeader.alignment = { vertical: "middle", horizontal: "center" };
  totalDepHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" }
  };
  totalDepHeader.border = ALL_THIN_BORDERS;

  // WDV Closing Header
  const wdvClosingHeader = headerRow.getCell(totalCols);
  wdvClosingHeader.value = "WDV Closing Value (₹)";
  wdvClosingHeader.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
  wdvClosingHeader.alignment = { vertical: "middle", horizontal: "center" };
  wdvClosingHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" }
  };
  wdvClosingHeader.border = ALL_THIN_BORDERS;

  // --- Data Rows (Row 2 onwards) ---
  data.forEach((rowItem, rIdx) => {
    const excelRowNum = 2 + rIdx;
    const row = ws.getRow(excelRowNum);
    row.height = 22;

    const rowBg = rIdx % 2 === 1 ? "FFF8FAFC" : "FFFFFFFF";

    // 1. Category
    const catCell = row.getCell(1);
    catCell.value = rowItem.category;
    catCell.font = { name: "Calibri", size: 9.5 };
    catCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    catCell.border = ALL_THIN_BORDERS;
    catCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };

    // 2. Asset Name
    const assetCell = row.getCell(2);
    assetCell.value = rowItem.assetName;
    assetCell.font = { name: "Calibri", size: 9.5, bold: true };
    assetCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    assetCell.border = ALL_THIN_BORDERS;
    assetCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };

    // 3. Dep %
    const depRate = parseVal(rowItem.depPercentage);
    const depRateCell = row.getCell(3);
    depRateCell.value = depRate / 100;
    depRateCell.numFmt = "0.0%";
    depRateCell.font = { name: "Calibri", size: 9.5 };
    depRateCell.alignment = { vertical: "middle", horizontal: "center" };
    depRateCell.border = ALL_THIN_BORDERS;
    depRateCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };

    // 4. Purchase Date
    const pDateCell = row.getCell(4);
    pDateCell.value = rowItem.purchaseDate || "-";
    pDateCell.font = { name: "Calibri", size: 9.5 };
    pDateCell.alignment = { vertical: "middle", horizontal: "center" };
    pDateCell.border = ALL_THIN_BORDERS;
    pDateCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };

    // 5. Purchase Value
    const pVal = parseVal(rowItem.purchaseValue);
    const pValCell = row.getCell(5);
    pValCell.value = pVal;
    pValCell.numFmt = "#,##,##0;[Red]-#,##,##0;\"-\"";
    pValCell.font = { name: "Calibri", size: 9.5 };
    pValCell.alignment = { vertical: "middle", horizontal: "right" };
    pValCell.border = ALL_THIN_BORDERS;
    pValCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };

    // 6. Opening Date
    const oDateCell = row.getCell(6);
    oDateCell.value = rowItem.openingDate || "-";
    oDateCell.font = { name: "Calibri", size: 9.5 };
    oDateCell.alignment = { vertical: "middle", horizontal: "center" };
    oDateCell.border = ALL_THIN_BORDERS;
    oDateCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };

    // 7. WDV Opening Value
    const wdvOpening = parseVal(rowItem.wdvOpeningValue);
    const wdvOpenCell = row.getCell(7);
    wdvOpenCell.value = wdvOpening;
    wdvOpenCell.numFmt = "#,##,##0;[Red]-#,##,##0;\"-\"";
    wdvOpenCell.font = { name: "Calibri", size: 9.5, bold: true };
    wdvOpenCell.alignment = { vertical: "middle", horizontal: "right" };
    wdvOpenCell.border = ALL_THIN_BORDERS;
    wdvOpenCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };

    // Months (8..19)
    let rowDepTotal = 0;
    MONTH_KEYS.forEach((mKey, mIdx) => {
      const colNum = staticHeaders.length + 1 + mIdx;
      const mVal = parseVal(rowItem[mKey]);
      rowDepTotal += mVal;

      const cell = row.getCell(colNum);
      cell.value = mVal;
      cell.numFmt = "#,##,##0;[Red]-#,##,##0;\"-\"";
      cell.font = { name: "Calibri", size: 9.5 };
      cell.alignment = { vertical: "middle", horizontal: "right" };
      cell.border = ALL_THIN_BORDERS;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    });

    // Total Dep (Col 20)
    const totalDepCell = row.getCell(totalCols - 1);
    totalDepCell.value = rowDepTotal;
    totalDepCell.numFmt = "#,##,##0;[Red]-#,##,##0;\"-\"";
    totalDepCell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FF1D4ED8" } };
    totalDepCell.alignment = { vertical: "middle", horizontal: "right" };
    totalDepCell.border = ALL_THIN_BORDERS;
    totalDepCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };

    // WDV Closing Value (Col 21)
    const wdvClosing = Math.max(0, wdvOpening - rowDepTotal);
    const wdvClosingCell = row.getCell(totalCols);
    wdvClosingCell.value = wdvClosing;
    wdvClosingCell.numFmt = "#,##,##0;[Red]-#,##,##0;\"-\"";
    wdvClosingCell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FF0F172A" } };
    wdvClosingCell.alignment = { vertical: "middle", horizontal: "right" };
    wdvClosingCell.border = ALL_THIN_BORDERS;
    wdvClosingCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  });

  // --- Grand Total Row ---
  const grandTotalRowNum = 2 + data.length;
  const grandTotalRow = ws.getRow(grandTotalRowNum);
  grandTotalRow.height = 24;

  const GRAND_TOTAL_FILL: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFEF08A" } // Soft Yellow Accent
  };

  // Grand Total Label
  ws.mergeCells(grandTotalRowNum, 1, grandTotalRowNum, 4);
  const gtLabelCell = grandTotalRow.getCell(1);
  gtLabelCell.value = "Grand Total";
  gtLabelCell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FF0F172A" } };
  gtLabelCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  gtLabelCell.border = { ...ALL_THIN_BORDERS, bottom: BORDER_DOUBLE };
  gtLabelCell.fill = GRAND_TOTAL_FILL;

  for (let c = 2; c <= 4; c++) {
    const cCell = grandTotalRow.getCell(c);
    cCell.border = { ...ALL_THIN_BORDERS, bottom: BORDER_DOUBLE };
    cCell.fill = GRAND_TOTAL_FILL;
  }

  // Total Purchase Value
  const gtPValCell = grandTotalRow.getCell(5);
  gtPValCell.value = totals.purchaseValue || 0;
  gtPValCell.numFmt = "#,##,##0;[Red]-#,##,##0;\"0\"";
  gtPValCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
  gtPValCell.alignment = { vertical: "middle", horizontal: "right" };
  gtPValCell.border = { ...ALL_THIN_BORDERS, bottom: BORDER_DOUBLE };
  gtPValCell.fill = GRAND_TOTAL_FILL;

  // Opening Date blank
  const gtDateBlank = grandTotalRow.getCell(6);
  gtDateBlank.value = "";
  gtDateBlank.border = { ...ALL_THIN_BORDERS, bottom: BORDER_DOUBLE };
  gtDateBlank.fill = GRAND_TOTAL_FILL;

  // Total WDV Opening Value
  const gtWdvOpenCell = grandTotalRow.getCell(7);
  gtWdvOpenCell.value = totals.wdvOpeningValue || 0;
  gtWdvOpenCell.numFmt = "#,##,##0;[Red]-#,##,##0;\"0\"";
  gtWdvOpenCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
  gtWdvOpenCell.alignment = { vertical: "middle", horizontal: "right" };
  gtWdvOpenCell.border = { ...ALL_THIN_BORDERS, bottom: BORDER_DOUBLE };
  gtWdvOpenCell.fill = GRAND_TOTAL_FILL;

  // Monthly totals
  MONTH_KEYS.forEach((mKey, mIdx) => {
    const colNum = staticHeaders.length + 1 + mIdx;
    const cell = grandTotalRow.getCell(colNum);
    cell.value = totals[mKey] || 0;
    cell.numFmt = "#,##,##0;[Red]-#,##,##0;\"0\"";
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
    cell.alignment = { vertical: "middle", horizontal: "right" };
    cell.border = { ...ALL_THIN_BORDERS, bottom: BORDER_DOUBLE };
    cell.fill = GRAND_TOTAL_FILL;
  });

  // Grand Total Dep
  const gtTotalDepCell = grandTotalRow.getCell(totalCols - 1);
  gtTotalDepCell.value = totals.total || 0;
  gtTotalDepCell.numFmt = "#,##,##0;[Red]-#,##,##0;\"0\"";
  gtTotalDepCell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FF0F172A" } };
  gtTotalDepCell.alignment = { vertical: "middle", horizontal: "right" };
  gtTotalDepCell.border = { ...ALL_THIN_BORDERS, bottom: BORDER_DOUBLE };
  gtTotalDepCell.fill = GRAND_TOTAL_FILL;

  // Grand Total WDV Closing Value
  const gtWdvClosing = Math.max(0, (totals.wdvOpeningValue || 0) - (totals.total || 0));
  const gtWdvClosingCell = grandTotalRow.getCell(totalCols);
  gtWdvClosingCell.value = gtWdvClosing;
  gtWdvClosingCell.numFmt = "#,##,##0;[Red]-#,##,##0;\"0\"";
  gtWdvClosingCell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FF0F172A" } };
  gtWdvClosingCell.alignment = { vertical: "middle", horizontal: "right" };
  gtWdvClosingCell.border = { ...ALL_THIN_BORDERS, bottom: BORDER_DOUBLE };
  gtWdvClosingCell.fill = GRAND_TOTAL_FILL;

  // Write & Download in Browser
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const finalFileName = fileName || (moduleType === "budget" ? `Depreciation_Budget_${financialYear}.xlsx` : `Depreciation_Actual_${financialYear}.xlsx`);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = finalFileName.endsWith(".xlsx") ? finalFileName : `${finalFileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
