import ExcelJS from "exceljs";

export interface ActualVsBudgetExportParams {
  financialYear: string;
  budgetData: Record<string, number[]>;
  actualData: Record<string, number[]>;
  months: { key: string; label: string }[];
  rows: string[];
}

export async function exportActualVsBudgetExcel({
  financialYear,
  budgetData,
  actualData,
  months,
  rows
}: ActualVsBudgetExportParams) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Finance System";
  wb.created = new Date();

  const ws = wb.addWorksheet(`Actual vs Budget FY ${financialYear}`, {
    views: [
      {
        state: "frozen",
        xSplit: 1,
        ySplit: 2,
        activeCell: "B3",
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

  const totalCols = 1 + months.length * 4;

  // --- Palette & Borders ---
  const BORDER_THIN: ExcelJS.Border = { style: "thin", color: { argb: "FFCBD5E1" } };
  const BORDER_MEDIUM: ExcelJS.Border = { style: "medium", color: { argb: "FF94A3B8" } };
  const BORDER_DOUBLE: ExcelJS.Border = { style: "double", color: { argb: "FF475569" } };

  const ALL_THIN_BORDERS: Partial<ExcelJS.Borders> = {
    top: BORDER_THIN,
    bottom: BORDER_THIN,
    left: BORDER_THIN,
    right: BORDER_THIN
  };

  // Set Column widths
  ws.getColumn(1).width = 34; // Head column
  for (let c = 2; c <= totalCols; c++) {
    const subIdx = (c - 2) % 4;
    ws.getColumn(c).width = subIdx === 3 ? 13 : 15;
  }

  // --- Row 1: Month Headers (Tier 1) ---
  const headerRow1 = ws.getRow(1);
  headerRow1.height = 28;

  // Head label spans Rows 1 and 2
  ws.mergeCells(1, 1, 2, 1);
  const headCell = ws.getCell(1, 1);
  headCell.value = "Head / P&L Item";
  headCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  headCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  headCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" } // Deep Navy / Slate 900
  };
  headCell.border = ALL_THINBorders(BORDER_MEDIUM);

  // Month header groups (Apr, May, Jun, etc.)
  months.forEach((m, mIdx) => {
    const startCol = 2 + mIdx * 4;
    const endCol = startCol + 3;
    ws.mergeCells(1, startCol, 1, endCol);

    const mCell = ws.getCell(1, startCol);
    mCell.value = m.label;
    mCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    mCell.alignment = { vertical: "middle", horizontal: "center" };

    // Alternate subtle background tones between months for clear grouping
    const monthBg = mIdx % 2 === 0 ? "FF1E293B" : "FF334155";
    mCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: monthBg }
    };
    mCell.border = ALL_THINBorders(BORDER_MEDIUM);
  });

  // --- Row 2: Metric Subheaders (Tier 2) ---
  const headerRow2 = ws.getRow(2);
  headerRow2.height = 24;

  months.forEach((_, mIdx) => {
    const startCol = 2 + mIdx * 4;
    const subHeaders = [
      { label: "Budget", bg: "FF2563EB", fg: "FFFFFFFF" },
      { label: "Actual", bg: "FF1D4ED8", fg: "FFFFFFFF" },
      { label: "Variance", bg: "FF475569", fg: "FFFFFFFF" },
      { label: "Variance %", bg: "FF64748B", fg: "FFFFFFFF" }
    ];

    subHeaders.forEach((sub, sIdx) => {
      const cell = ws.getCell(2, startCol + sIdx);
      cell.value = sub.label;
      cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: sub.fg } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: sub.bg }
      };
      cell.border = ALL_THIN_BORDERS;
    });
  });

  // --- Data Rows (Row 3 onwards) ---
  rows.forEach((rowName, rIdx) => {
    const excelRowNum = 3 + rIdx;
    const row = ws.getRow(excelRowNum);
    row.height = 22;

    const isPctRow = rowName.includes("%");
    const isSummaryRow = [
      "Revenue",
      "Gross Margin",
      "Gross Margin %Age",
      "Total Corporate Expenses",
      "EBITA",
      "EBITA %Age",
      "NP",
      "NP % Age"
    ].includes(rowName);

    const isNpRow = rowName === "NP" || rowName === "NP % Age";
    const isGrossMarginRow = rowName === "Gross Margin" || rowName === "Gross Margin %Age";
    const isEbitaRow = rowName === "EBITA" || rowName === "EBITA %Age";

    // Row Fill styling
    let rowBgColor: string | null = null;
    if (isNpRow) {
      rowBgColor = "FFDCFCE7"; // Light Emerald 100
    } else if (isEbitaRow) {
      rowBgColor = "FFFEF3C7"; // Light Amber 100
    } else if (isGrossMarginRow) {
      rowBgColor = "FFEFF6FF"; // Light Blue 50
    } else if (isSummaryRow) {
      rowBgColor = "FFF8FAFC"; // Slate 50
    } else if (rIdx % 2 === 1) {
      rowBgColor = "FFFBFBFC"; // Zebra striping
    }

    // Col 1: Head Cell
    const headDataCell = row.getCell(1);
    headDataCell.value = rowName;
    headDataCell.font = {
      name: "Calibri",
      size: 10,
      bold: isSummaryRow,
      color: { argb: isNpRow ? "FF14532D" : "FF0F172A" }
    };
    headDataCell.alignment = {
      vertical: "middle",
      horizontal: "left",
      indent: isPctRow ? 2 : 1
    };
    headDataCell.border = ALL_THIN_BORDERS;

    if (rowBgColor) {
      headDataCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowBgColor }
      };
    }

    // Month Data Columns
    months.forEach((_, mIdx) => {
      const startCol = 2 + mIdx * 4;

      const rawBudget = budgetData[rowName] ? budgetData[rowName][mIdx] : 0;
      const rawActual = actualData[rowName] ? actualData[rowName][mIdx] : 0;
      const rawVariance = rawActual - rawBudget;

      let rawVarPct = 0;
      if (rawBudget !== 0) {
        rawVarPct = (rawVariance / Math.abs(rawBudget)) * 100;
      }

      // 1. Budget Cell
      const budgetCell = row.getCell(startCol);
      budgetCell.value = isPctRow ? rawBudget / 100 : rawBudget;
      budgetCell.numFmt = isPctRow ? "0.0%" : "#,##,##0;[Red]-#,##,##0;\"-\"";
      budgetCell.font = { name: "Calibri", size: 9.5, bold: isSummaryRow };
      budgetCell.alignment = { vertical: "middle", horizontal: "right" };
      budgetCell.border = ALL_THIN_BORDERS;

      // 2. Actual Cell
      const actualCell = row.getCell(startCol + 1);
      actualCell.value = isPctRow ? rawActual / 100 : rawActual;
      actualCell.numFmt = isPctRow ? "0.0%" : "#,##,##0;[Red]-#,##,##0;\"-\"";
      actualCell.font = {
        name: "Calibri",
        size: 9.5,
        bold: isSummaryRow,
        color: { argb: "FF1D4ED8" } // Blue accent for actual
      };
      actualCell.alignment = { vertical: "middle", horizontal: "right" };
      actualCell.border = ALL_THIN_BORDERS;

      // 3. Variance Cell
      const varCell = row.getCell(startCol + 2);
      varCell.value = isPctRow ? rawVariance / 100 : rawVariance;
      varCell.numFmt = isPctRow ? "0.0%;[Red]-0.0%;\"0.0%\"" : "#,##,##0;[Red]-#,##,##0;\"-\"";
      varCell.font = {
        name: "Calibri",
        size: 9.5,
        bold: isSummaryRow || Math.abs(rawVariance) > 0.01,
        color: {
          argb: rawVariance < 0 ? "FFDC2626" : rawVariance > 0 ? "FF16A34A" : "FF475569"
        }
      };
      varCell.alignment = { vertical: "middle", horizontal: "right" };
      varCell.border = ALL_THIN_BORDERS;

      // 4. Variance % Cell
      const varPctCell = row.getCell(startCol + 3);
      varPctCell.value = rawVarPct / 100;
      varPctCell.numFmt = "0.0%;[Red]-0.0%;\"0.0%\"";
      varPctCell.font = {
        name: "Calibri",
        size: 9.5,
        bold: isSummaryRow || Math.abs(rawVariance) > 0.01,
        color: {
          argb: rawVarPct < 0 ? "FFDC2626" : rawVarPct > 0 ? "FF16A34A" : "FF475569"
        }
      };
      varPctCell.alignment = { vertical: "middle", horizontal: "right" };
      varPctCell.border = ALL_THIN_BORDERS;

      // Apply row background fill
      if (rowBgColor) {
        const fillObj: ExcelJS.Fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rowBgColor }
        };
        budgetCell.fill = fillObj;
        actualCell.fill = fillObj;
        varCell.fill = fillObj;
        varPctCell.fill = fillObj;
      }
    });

    // Accounting double bottom border for the final NP row
    if (rowName === "NP % Age") {
      for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c);
        cell.border = {
          ...cell.border,
          bottom: BORDER_DOUBLE
        };
      }
    }
  });

  // Write & Download in Browser
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Actual_VS_Budget_${financialYear}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function ALL_THINBorders(border: ExcelJS.Border): Partial<ExcelJS.Borders> {
  return {
    top: border,
    bottom: border,
    left: border,
    right: border
  };
}
