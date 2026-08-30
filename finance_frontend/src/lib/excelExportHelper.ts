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
