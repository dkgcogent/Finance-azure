import ExcelJS from "exceljs";

export interface ImprestBankPaymentRow {
  transactionType?: string; // Default: 'IFC'
  debitAccountNo?: string;  // Default: '163905500140'
  ifscCode: string;
  beneficiaryAccountNo: string;
  beneficiaryName: string;
  amount: number;
  remarksClient: string;
  remarksBeneficiary: string;
}

export async function generateImprestBankPaymentExcel(
  data: ImprestBankPaymentRow[],
  fileSuffix: string,
  fileNamePrefix: string = "Imprest_Payment_Bank_Format"
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Finance System";
  wb.created = new Date();

  // Create Converter worksheet
  const ws = wb.addWorksheet("Converter", {
    views: [{ showGridLines: true }]
  });

  // Define Styles
  const THIN_BORDER: ExcelJS.Border = { style: "thin", color: { argb: "FFD4D4D8" } };
  const BORDER_ALL: Partial<ExcelJS.Borders> = {
    top: THIN_BORDER,
    bottom: THIN_BORDER,
    left: THIN_BORDER,
    right: THIN_BORDER
  };

  const HEADER_FILL: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF000000" } // Black Header
  };

  const RED_HEADER_FILL: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFC00000" } // Red Header for Output Column
  };

  const YELLOW_ROW_FILL: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF2CC" } // Light Yellow Data Rows
  };

  const OUTPUT_ROW_FILL: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF9FBF9" } // Soft pale background for output
  };

  // Setup Column Definitions & Widths
  ws.columns = [
    { key: "colA", width: 20 }, // Transaction type
    { key: "colB", width: 22 }, // Debit Account no
    { key: "colC", width: 22 }, // IFSC
    { key: "colD", width: 26 }, // Beneficiary Account No
    { key: "colE", width: 28 }, // Beneficiary Name
    { key: "colF", width: 18 }, // Amount (₹)
    { key: "colG", width: 22 }, // Remarks for Client
    { key: "colH", width: 24 }, // Remarks for Beneficiary
    { key: "colI", width: 4 },  // Spacer
    { key: "colJ", width: 85 }  // Output Formula / String
  ];

  // Row 1: Headers (Directly starting table headers as requested, without the top circled header block)
  const headerRow = ws.getRow(1);
  headerRow.height = 42;

  const headers = [
    "Transaction type\n(Within Bank (WIB) / NEFT (NFT)/ RTGS (RTG)/ IMPS (IFC))",
    "Debit Account no\nShould be exactly 12 digit",
    "IFSC (Always 11 character alphanumeric and 5th character always 0 (zero))",
    "Beneficiary Account No\n(Max length 34 char alphanumeric / ICICI 12 digit)",
    "Beneficiary Name (Max length 32 Character)\n(No Special Character allowed)",
    "Amount (₹)\n(Decimals & paise allowed)",
    "Remarks for Client\n(Max 21 characters)",
    "Remarks for Beneficiary\n(Max 30 characters)",
    "",
    "OutPut\n(Ready for Bank Upload / Copy to .txt)"
  ];

  headers.forEach((hText, idx) => {
    const colNum = idx + 1;
    const cell = headerRow.getCell(colNum);
    cell.value = hText;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = BORDER_ALL;

    if (colNum === 10) {
      cell.fill = RED_HEADER_FILL;
      cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    } else if (colNum === 9) {
      // Empty spacer column
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
    } else {
      cell.fill = HEADER_FILL;
      cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    }
  });

  // If no data, populate at least one demo/empty row so format is preserved
  const rowsToProcess = data.length > 0 ? data : [
    {
      transactionType: "IFC",
      debitAccountNo: "163905500140",
      ifscCode: "ICIC0000011",
      beneficiaryAccountNo: "000100000001",
      beneficiaryName: "Sample Beneficiary",
      amount: 0,
      remarksClient: "IMPREST",
      remarksBeneficiary: "Imprest Payment"
    }
  ];

  // Populate Data Rows starting from row 2
  rowsToProcess.forEach((item, index) => {
    const rNum = index + 2;
    const row = ws.getRow(rNum);
    row.height = 24;

    const txnType = item.transactionType || "IFC";
    const debitAcc = item.debitAccountNo || "163905500140";
    const ifsc = item.ifscCode || "ICIC0000011";
    const accNo = item.beneficiaryAccountNo || "";
    const bName = item.beneficiaryName || "";
    const amountVal = Number(item.amount) || 0;
    const remClient = (item.remarksClient || "IMPREST").substring(0, 21);
    const remBeneficiary = (item.remarksBeneficiary || "Imprest Payment").substring(0, 30);

    // Col A: Transaction type
    const cellA = row.getCell(1);
    cellA.value = txnType;
    cellA.alignment = { vertical: "middle", horizontal: "center" };
    cellA.fill = YELLOW_ROW_FILL;
    cellA.font = { name: "Arial", size: 10 };
    cellA.border = BORDER_ALL;

    // Col B: Debit Account no
    const cellB = row.getCell(2);
    cellB.value = debitAcc;
    cellB.alignment = { vertical: "middle", horizontal: "center" };
    cellB.fill = YELLOW_ROW_FILL;
    cellB.font = { name: "Arial", size: 10 };
    cellB.border = BORDER_ALL;

    // Col C: IFSC
    const cellC = row.getCell(3);
    cellC.value = ifsc;
    cellC.alignment = { vertical: "middle", horizontal: "center" };
    cellC.fill = YELLOW_ROW_FILL;
    cellC.font = { name: "Arial", size: 10 };
    cellC.border = BORDER_ALL;

    // Col D: Beneficiary Account No
    const cellD = row.getCell(4);
    cellD.value = accNo;
    cellD.alignment = { vertical: "middle", horizontal: "left" };
    cellD.fill = YELLOW_ROW_FILL;
    cellD.font = { name: "Arial", size: 10 };
    cellD.border = BORDER_ALL;

    // Col E: Beneficiary Name
    const cellE = row.getCell(5);
    cellE.value = bName;
    cellE.alignment = { vertical: "middle", horizontal: "left" };
    cellE.fill = YELLOW_ROW_FILL;
    cellE.font = { name: "Arial", size: 10 };
    cellE.border = BORDER_ALL;

    // Col F: Amount
    const cellF = row.getCell(6);
    cellF.value = amountVal;
    cellF.numFmt = "#,##0.00";
    cellF.alignment = { vertical: "middle", horizontal: "right" };
    cellF.fill = YELLOW_ROW_FILL;
    cellF.font = { name: "Arial", size: 10, bold: true };
    cellF.border = BORDER_ALL;

    // Col G: Remarks for Client
    const cellG = row.getCell(7);
    cellG.value = remClient;
    cellG.alignment = { vertical: "middle", horizontal: "left" };
    cellG.fill = YELLOW_ROW_FILL;
    cellG.font = { name: "Arial", size: 10 };
    cellG.border = BORDER_ALL;

    // Col H: Remarks for Beneficiary
    const cellH = row.getCell(8);
    cellH.value = remBeneficiary;
    cellH.alignment = { vertical: "middle", horizontal: "left" };
    cellH.fill = YELLOW_ROW_FILL;
    cellH.font = { name: "Arial", size: 10 };
    cellH.border = BORDER_ALL;

    // Col I: Spacer
    const cellI = row.getCell(9);
    cellI.value = "";
    cellI.border = {
      right: { style: "medium", color: { argb: "FFC00000" } }
    };

    // Col J: Output formula & pre-computed string value
    const isWib = txnType.toUpperCase() === "WIB";
    const prefix = isWib ? "APW" : "APO";
    const computedResult = `${prefix}|${txnType}|${Math.round(amountVal * 100) / 100}|INR|${debitAcc}|0011|${ifsc}|${accNo}|0011|${bName}|${remClient}|${remBeneficiary}^`;

    const cellJ = row.getCell(10);
    cellJ.value = {
      formula: `IF(A${rNum}="WIB","APW","APO")&"|"&A${rNum}&"|"&ROUND(F${rNum},2)&"|INR|"&B${rNum}&"|0011|"&IF(A${rNum}="WIB","ICIC0000011",C${rNum})&"|"&D${rNum}&"|0011|"&E${rNum}&"|"&G${rNum}&"|"&H${rNum}&"^"`,
      result: computedResult
    };
    cellJ.alignment = { vertical: "middle", horizontal: "left" };
    cellJ.fill = OUTPUT_ROW_FILL;
    cellJ.font = { name: "Consolas", size: 9.5, color: { argb: "FF1E293B" } };
    cellJ.border = BORDER_ALL;
  });

  // Write and trigger download
  const safeSuffix = (fileSuffix || "all").replace(/[\/\\?%*:|"<>]/g, "-");
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileNamePrefix}_${safeSuffix}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export interface NormalExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export async function generateNormalPaymentExcel(
  columns: NormalExcelColumn[],
  rows: Record<string, any>[],
  fileName: string
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Finance System";
  wb.created = new Date();

  const ws = wb.addWorksheet("Payment Sheet", {
    views: [{ showGridLines: true }]
  });

  const THIN_BORDER: ExcelJS.Border = { style: "thin", color: { argb: "FFD4D4D8" } };
  const BORDER_ALL: Partial<ExcelJS.Borders> = {
    top: THIN_BORDER,
    bottom: THIN_BORDER,
    left: THIN_BORDER,
    right: THIN_BORDER
  };

  const HEADER_FILL: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" } // Slate 800
  };

  ws.columns = columns.map(c => ({
    key: c.key,
    width: c.width || 20
  }));

  // Header Row
  const headerRow = ws.getRow(1);
  headerRow.height = 28;

  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = HEADER_FILL;
    cell.border = BORDER_ALL;
  });

  // Data Rows
  rows.forEach((rowData, rIdx) => {
    const row = ws.getRow(rIdx + 2);
    row.height = 22;

    columns.forEach((col, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      const val = rowData[col.key];
      cell.value = val !== undefined && val !== null ? val : "";
      cell.font = { name: "Arial", size: 9.5 };
      cell.border = BORDER_ALL;

      if (typeof val === "number") {
        cell.alignment = { vertical: "middle", horizontal: "right" };
        cell.numFmt = "#,##0.00";
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }

      if (rIdx % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" }
        };
      }
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

