import ExcelJS from "exceljs";

const THIN_BORDER: ExcelJS.Border = {
  style: "thin",
  color: { argb: "FF000000" },
};

const BORDER_ALL: Partial<ExcelJS.Borders> = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
};

// Subtle classic soft header fill (light blue-gray)
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9E1F2" },
};

export interface TableExportOptions {
  sheetName: string;
  headers: string[];
  data: any[][];
  fileName: string;
}

/**
 * Exports a clean, subtle, and professionally structured single-sheet Excel workbook.
 */
export async function exportTableToExcel({
  sheetName,
  headers,
  data,
  fileName,
}: TableExportOptions): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  });

  // 1. Add Header Row
  const headerRow = ws.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF000000" } };
    cell.fill = HEADER_FILL;
    cell.border = BORDER_ALL;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });

  // 2. Add Data Rows
  data.forEach((row) => {
    const dataRow = ws.addRow(row);
    dataRow.height = 20;
    dataRow.eachCell((cell, colNum) => {
      cell.font = { size: 10, name: "Calibri", color: { argb: "FF000000" } };
      cell.border = BORDER_ALL;

      const headerTitle = String(headers[colNum - 1] || "").toLowerCase();
      const rawVal = cell.value;
      const isNumber = typeof rawVal === "number";

      if (
        isNumber &&
        (headerTitle.includes("amount") ||
          headerTitle.includes("rate") ||
          headerTitle.includes("cost") ||
          headerTitle.includes("charge") ||
          headerTitle.includes("total") ||
          headerTitle.includes("hike") ||
          headerTitle.includes("toll"))
      ) {
        cell.numFmt = "#,##0.00";
        cell.alignment = { horizontal: "right", vertical: "middle" };
      } else if (isNumber) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (headerTitle.includes("account") || headerTitle.includes("code") || headerTitle.includes("ifsc") || headerTitle.includes("date")) {
        cell.numFmt = "@";
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }
    });
  });

  // 3. Dynamic Column Widths
  headers.forEach((h, idx) => {
    let maxLen = String(h || "").length;
    data.forEach((r) => {
      const val = r[idx];
      const valLen = val !== null && val !== undefined ? String(val).length : 0;
      if (valLen > maxLen) maxLen = valLen;
    });
    const col = ws.getColumn(idx + 1);
    col.width = Math.min(35, Math.max(12, maxLen + 3));
  });

  // 4. Download file
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface FinancialSummaryExportRow {
  name: string;
  isBold?: boolean;
  isPercent?: boolean;
  isDivider?: boolean;
  isYellow?: boolean;
  values: (number | string | null | undefined)[];
  total?: number | string | null;
}

export interface FinancialSummaryExportOptions {
  sheetName?: string;
  headers: string[]; // 12 month strings e.g. ['Apr-26', 'May-26', ...]
  rows: FinancialSummaryExportRow[];
  fileName: string;
}

const MONTH_CELL_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFFFCC" }, // soft pastel yellow matching UI #ffffcc
};

const TOTAL_CELL_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE6E699" }, // soft gold/khaki matching UI #e6e699
};

const TOTAL_HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFB8CCE4" }, // darker blue-gray header
};

/**
 * Exports a styled Financial Summary (Budget / Actual Summary) Excel workbook using ExcelJS.
 */
export async function exportFinancialSummaryExcel({
  sheetName = "Summary",
  headers,
  rows,
  fileName,
}: FinancialSummaryExportOptions): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  });

  // 1. Header Row
  const allHeaders = ["Head", ...headers, "Total"];
  const headerRow = ws.addRow(allHeaders);
  headerRow.height = 26;

  headerRow.eachCell((cell, colNum) => {
    const isTotal = colNum === allHeaders.length;
    cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF000000" } };
    cell.fill = isTotal ? TOTAL_HEADER_FILL : HEADER_FILL;
    cell.border = BORDER_ALL;
    cell.alignment = {
      horizontal: colNum === 1 ? "left" : "center",
      vertical: "middle",
      wrapText: true,
    };
  });

  // 2. Data Rows
  rows.forEach((r) => {
    if (r.isDivider) {
      const dividerRow = ws.addRow([]);
      dividerRow.height = 10;
      return;
    }

    const rowValues = [r.name, ...r.values, r.total ?? ""];
    const dataRow = ws.addRow(rowValues);
    dataRow.height = 20;

    dataRow.eachCell((cell, colNum) => {
      const isHeadCol = colNum === 1;
      const isTotalCol = colNum === allHeaders.length;
      const isBold = !!r.isBold || isTotalCol || !!r.isYellow;

      cell.font = {
        bold: isBold,
        size: 10,
        name: "Calibri",
        color: { argb: "FF000000" },
      };
      cell.border = BORDER_ALL;

      if (isHeadCol) {
        if (r.isYellow) {
          cell.fill = TOTAL_CELL_FILL;
        }
        cell.alignment = { horizontal: "left", vertical: "middle" };
      } else if (isTotalCol) {
        cell.fill = TOTAL_CELL_FILL;
        cell.alignment = { horizontal: "right", vertical: "middle" };
        if (typeof cell.value === "number") {
          cell.numFmt = r.isPercent ? '0.00"%"' : '#,##0;[Red]-#,##0;"-"';
        }
      } else {
        // Month columns
        cell.fill = r.isYellow ? TOTAL_CELL_FILL : MONTH_CELL_FILL;
        cell.alignment = { horizontal: "right", vertical: "middle" };
        if (typeof cell.value === "number") {
          cell.numFmt = r.isPercent ? '0.00"%"' : '#,##0;[Red]-#,##0;"-"';
        }
      }
    });
  });

  // 3. Set generous Column Widths so nothing gets cut off
  ws.getColumn(1).width = 38; // Head column
  for (let i = 2; i <= headers.length + 1; i++) {
    ws.getColumn(i).width = 15; // Month columns
  }
  ws.getColumn(allHeaders.length).width = 18; // Total column

  // 4. Download file
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formats a worksheet inside a multi-sheet workbook with the same subtle, clean styling.
 */
export function applySubtleTableStyle(
  ws: ExcelJS.Worksheet,
  headers: string[],
  data: any[][]
): void {
  const headerRow = ws.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF000000" } };
    cell.fill = HEADER_FILL;
    cell.border = BORDER_ALL;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });

  data.forEach((row) => {
    const dataRow = ws.addRow(row);
    dataRow.height = 20;
    dataRow.eachCell((cell) => {
      cell.font = { size: 10, name: "Calibri", color: { argb: "FF000000" } };
      cell.border = BORDER_ALL;
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
  });

  headers.forEach((h, idx) => {
    let maxLen = String(h || "").length;
    data.forEach((r) => {
      const val = r[idx];
      const valLen = val !== null && val !== undefined ? String(val).length : 0;
      if (valLen > maxLen) maxLen = valLen;
    });
    const col = ws.getColumn(idx + 1);
    col.width = Math.min(35, Math.max(12, maxLen + 3));
  });
}

export interface RevenueDirectExpenseExportRow {
  customer: string;
  project: string;
  location: string;
  head: string;
  months: (number | string | null | undefined)[];
  total: number | string | null | undefined;
  isYellow?: boolean;
  isGroupEnd?: boolean;
}

export interface RevenueDirectExpenseExportOptions {
  sheetName?: string;
  monthHeaders: string[]; // 12 month strings e.g. ['Apr-26', 'May-26', ...]
  rows: RevenueDirectExpenseExportRow[];
  totals: {
    head: string;
    months: (number | string | null | undefined)[];
    total: number | string | null | undefined;
    isYellow?: boolean;
  }[];
  fileName: string;
}

/**
 * Exports a styled Revenue & Direct Expense Excel workbook using ExcelJS.
 */
export async function exportRevenueDirectExpenseExcel({
  sheetName = "Revenue & Direct Expense",
  monthHeaders,
  rows,
  totals,
  fileName,
}: RevenueDirectExpenseExportOptions): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  });

  const allHeaders = ["Customer", "Project", "Location", "Head", ...monthHeaders, "Total"];
  const headerRow = ws.addRow(allHeaders);
  headerRow.height = 26;

  headerRow.eachCell((cell, colNum) => {
    const isTotal = colNum === allHeaders.length;
    cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF000000" } };
    cell.fill = isTotal ? TOTAL_HEADER_FILL : HEADER_FILL;
    cell.border = BORDER_ALL;
    cell.alignment = {
      horizontal: colNum <= 4 ? "left" : (isTotal ? "right" : "center"),
      vertical: "middle",
      wrapText: true,
    };
  });

  // Regular group data rows
  rows.forEach((r) => {
    const rowValues = [r.customer, r.project, r.location, r.head, ...r.months, r.total ?? ""];
    const dataRow = ws.addRow(rowValues);
    dataRow.height = 20;

    const isPct = r.head.includes("%");

    dataRow.eachCell((cell, colNum) => {
      const isTextCol = colNum <= 4;
      const isTotalCol = colNum === allHeaders.length;

      cell.font = {
        size: 10,
        name: "Calibri",
        color: { argb: "FF000000" },
      };

      // Border: if group end, give thicker bottom border
      if (r.isGroupEnd) {
        cell.border = {
          ...BORDER_ALL,
          bottom: { style: "medium", color: { argb: "FF94A3B8" } },
        };
      } else {
        cell.border = BORDER_ALL;
      }

      if (isTextCol) {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      } else if (isTotalCol) {
        cell.fill = TOTAL_CELL_FILL;
        cell.alignment = { horizontal: "right", vertical: "middle" };
        if (typeof cell.value === "number") {
          cell.numFmt = isPct ? '0.00"%"' : '#,##0;[Red]-#,##0;"-"';
        }
      } else {
        if (r.isYellow) {
          cell.fill = MONTH_CELL_FILL;
        }
        cell.alignment = { horizontal: "right", vertical: "middle" };
        if (typeof cell.value === "number") {
          cell.numFmt = isPct ? '0.00"%"' : '#,##0;[Red]-#,##0;"-"';
        }
      }
    });
  });

  // Totals rows
  totals.forEach((t) => {
    const rowValues = ["Total", "Total", "Total", t.head, ...t.months, t.total ?? ""];
    const totalRow = ws.addRow(rowValues);
    totalRow.height = 22;

    const isPct = t.head.includes("%");

    totalRow.eachCell((cell, colNum) => {
      const isTextCol = colNum <= 4;
      const isTotalCol = colNum === allHeaders.length;

      cell.font = {
        bold: true,
        size: 10,
        name: "Calibri",
        color: { argb: "FF000000" },
      };
      cell.border = BORDER_ALL;

      if (isTextCol) {
        cell.alignment = { horizontal: "left", vertical: "middle" };
        if (colNum <= 3) {
          cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF64748B" } };
        }
      } else if (isTotalCol) {
        cell.fill = TOTAL_CELL_FILL;
        cell.alignment = { horizontal: "right", vertical: "middle" };
        if (typeof cell.value === "number") {
          cell.numFmt = isPct ? '0.00"%"' : '#,##0;[Red]-#,##0;"-"';
        }
      } else {
        if (t.isYellow) {
          cell.fill = MONTH_CELL_FILL;
        }
        cell.alignment = { horizontal: "right", vertical: "middle" };
        if (typeof cell.value === "number") {
          cell.numFmt = isPct ? '0.00"%"' : '#,##0;[Red]-#,##0;"-"';
        }
      }
    });
  });

  // Column Widths
  ws.getColumn(1).width = 20; // Customer
  ws.getColumn(2).width = 20; // Project
  ws.getColumn(3).width = 15; // Location
  ws.getColumn(4).width = 24; // Head
  for (let i = 5; i <= monthHeaders.length + 4; i++) {
    ws.getColumn(i).width = 15; // Month columns
  }
  ws.getColumn(allHeaders.length).width = 18; // Total column

  // Download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface SalaryExportRow {
  srNo: number | string;
  head: string;
  customer: string;
  project: string;
  location: string;
  designation: string;
  nameOfEmployee: string;
  months: (number | string | null | undefined)[];
  total: number | string | null | undefined;
}

export interface SalaryExportOptions {
  sheetName?: string;
  monthHeaders: string[]; // 12 month strings e.g. ['Apr-26', 'May-26', ...]
  rows: SalaryExportRow[];
  totals: {
    months: (number | string | null | undefined)[];
    total: number | string | null | undefined;
  };
  fileName: string;
}

/**
 * Exports a styled Salary Excel workbook using ExcelJS.
 */
export async function exportSalaryExcel({
  sheetName = "Salary",
  monthHeaders,
  rows,
  totals,
  fileName,
}: SalaryExportOptions): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  });

  const allHeaders = ["Sr No", "Head", "Customer", "Project", "Location", "Designation", "Name Of Employee", ...monthHeaders, "Total"];
  const headerRow = ws.addRow(allHeaders);
  headerRow.height = 26;

  headerRow.eachCell((cell, colNum) => {
    const isTotal = colNum === allHeaders.length;
    cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF000000" } };
    cell.fill = isTotal ? TOTAL_HEADER_FILL : HEADER_FILL;
    cell.border = BORDER_ALL;
    cell.alignment = {
      horizontal: colNum === 1 ? "center" : (colNum <= 7 ? "left" : (isTotal ? "right" : "center")),
      vertical: "middle",
      wrapText: true,
    };
  });

  // Data rows
  rows.forEach((r) => {
    const rowValues = [
      r.srNo,
      r.head,
      r.customer,
      r.project,
      r.location,
      r.designation,
      r.nameOfEmployee,
      ...r.months,
      r.total ?? "",
    ];
    const dataRow = ws.addRow(rowValues);
    dataRow.height = 20;

    dataRow.eachCell((cell, colNum) => {
      const isSrNo = colNum === 1;
      const isTextCol = colNum >= 2 && colNum <= 7;
      const isTotalCol = colNum === allHeaders.length;

      cell.font = {
        size: 10,
        name: "Calibri",
        color: { argb: "FF000000" },
      };
      cell.border = BORDER_ALL;

      if (isSrNo) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (isTextCol) {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      } else if (isTotalCol) {
        cell.fill = TOTAL_CELL_FILL;
        cell.alignment = { horizontal: "right", vertical: "middle" };
        if (typeof cell.value === "number") {
          cell.numFmt = '#,##0;[Red]-#,##0;"-"';
        }
      } else {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        if (typeof cell.value === "number") {
          cell.numFmt = '#,##0;[Red]-#,##0;"-"';
        }
      }
    });
  });

  // Total Row
  const totalRowValues = [
    "",
    "",
    "",
    "",
    "",
    "",
    "Total",
    ...totals.months,
    totals.total ?? "",
  ];
  const totalRow = ws.addRow(totalRowValues);
  totalRow.height = 22;

  totalRow.eachCell((cell, colNum) => {
    const isTextCol = colNum <= 7;
    cell.font = {
      bold: true,
      size: 10,
      name: "Calibri",
      color: { argb: "FF000000" },
    };
    cell.border = BORDER_ALL;
    cell.fill = TOTAL_CELL_FILL;

    if (isTextCol) {
      cell.alignment = { horizontal: colNum === 7 ? "right" : "left", vertical: "middle" };
    } else {
      cell.alignment = { horizontal: "right", vertical: "middle" };
      if (typeof cell.value === "number") {
        cell.numFmt = '#,##0;[Red]-#,##0;"-"';
      }
    }
  });

  // Column Widths
  ws.getColumn(1).width = 8; // Sr No
  ws.getColumn(2).width = 15; // Head
  ws.getColumn(3).width = 18; // Customer
  ws.getColumn(4).width = 18; // Project
  ws.getColumn(5).width = 15; // Location
  ws.getColumn(6).width = 25; // Designation
  ws.getColumn(7).width = 25; // Name Of Employee
  for (let i = 8; i <= monthHeaders.length + 7; i++) {
    ws.getColumn(i).width = 15; // Month columns
  }
  ws.getColumn(allHeaders.length).width = 18; // Total column

  // Download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}



