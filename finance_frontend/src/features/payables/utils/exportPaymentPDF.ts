import html2pdf from "html2pdf.js";

export interface PDFPaymentRow {
  date: string;
  name: string; // Employee Name or Vendor Name
  code?: string; // Employee Code
  accountNo: string;
  ifscCode: string;
  beneficiaryName: string;
  amount: number;
  remarks?: string;
}

export interface PDFExportOptions {
  title: string;
  subTitle?: string;
  periodLabel: string;
  batchId?: string;
  type: "salary" | "imprest" | "vendor";
  rows: PDFPaymentRow[];
  totalAmount: number;
  fileName: string;
}

export function exportStructuredPaymentPDF(options: PDFExportOptions) {
  const { title, subTitle, periodLabel, batchId, type, rows, totalAmount, fileName } = options;

  const isVendor = type === "vendor";
  const nameHeader = isVendor ? "Vendor Name" : "Employee Name";
  const formattedTotal = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(totalAmount);

  const currentDateStr = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  const element = document.createElement("div");
  element.style.width = "100%";
  element.style.padding = "24px 28px";
  element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  element.style.color = "#1E293B";
  element.style.backgroundColor = "#FFFFFF";

  element.innerHTML = `
    <div style="margin-bottom: 16px; border-bottom: 2px solid #0F172A; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #047857; text-transform: uppercase; margin-bottom: 4px;">
          Finance & Accounts Management
        </div>
        <h1 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
          ${title}
        </h1>
        <div style="font-size: 11px; color: #64748B; margin-top: 3px;">
          ${subTitle || "Official Bank Disbursement Summary"} • <span style="color: #0F172A; font-weight: 600;">${periodLabel}</span>
        </div>
      </div>
      <div style="text-align: right;">
        ${batchId ? `<div style="font-size: 10px; font-family: monospace; font-weight: 600; color: #475569; background: #F1F5F9; padding: 3px 8px; border-radius: 4px; display: inline-block; margin-bottom: 4px; border: 1px solid #E2E8F0;">${batchId}</div>` : ""}
        <div style="font-size: 10px; color: #94A3B8;">Generated: ${currentDateStr}</div>
      </div>
    </div>

    <!-- Summary Metrics Cards -->
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px;">
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 14px;">
        <div style="font-size: 9.5px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Total Records</div>
        <div style="font-size: 16px; font-weight: 800; color: #0F172A; margin-top: 2px;">${rows.length} ${isVendor ? "Vendors" : "Employees"}</div>
      </div>
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; padding: 10px 14px;">
        <div style="font-size: 9.5px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Total Net Disbursement</div>
        <div style="font-size: 16px; font-weight: 800; color: #047857; margin-top: 2px;">${formattedTotal}</div>
      </div>
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 14px;">
        <div style="font-size: 9.5px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Payment Mode / Status</div>
        <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-top: 4px;">Bank Transfer • Approved</div>
      </div>
    </div>

    <!-- Main Payment Table -->
    <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: left; margin-bottom: 24px; border: 1px solid #CBD5E1;">
      <thead>
        <tr style="background: #0F172A; color: #FFFFFF;">
          <th style="padding: 7px 8px; font-weight: 700; border: 1px solid #334155; width: 85px;">DATE</th>
          <th style="padding: 7px 8px; font-weight: 700; border: 1px solid #334155;">${nameHeader.toUpperCase()}</th>
          ${!isVendor ? `<th style="padding: 7px 8px; font-weight: 700; border: 1px solid #334155; width: 95px;">EMP CODE</th>` : ""}
          <th style="padding: 7px 8px; font-weight: 700; border: 1px solid #334155; width: 120px;">ACCOUNT NO</th>
          <th style="padding: 7px 8px; font-weight: 700; border: 1px solid #334155; width: 95px;">IFSC CODE</th>
          <th style="padding: 7px 8px; font-weight: 700; border: 1px solid #334155;">BENEFICIARY NAME</th>
          <th style="padding: 7px 8px; font-weight: 700; border: 1px solid #334155; text-align: right; width: 105px;">AMOUNT (₹)</th>
          <th style="padding: 7px 8px; font-weight: 700; border: 1px solid #334155; width: 130px;">REMARKS</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r, i) => `
          <tr style="background-color: ${i % 2 === 1 ? "#F8FAFC" : "#FFFFFF"}; page-break-inside: avoid;">
            <td style="padding: 6px 8px; border: 1px solid #E2E8F0; font-family: monospace; font-size: 9.5px; color: #475569;">${r.date || "-"}</td>
            <td style="padding: 6px 8px; border: 1px solid #E2E8F0; font-weight: 600; color: #0F172A;">${r.name || "-"}</td>
            ${!isVendor ? `<td style="padding: 6px 8px; border: 1px solid #E2E8F0; font-family: monospace; font-size: 9.5px; color: #64748B;">${r.code || "-"}</td>` : ""}
            <td style="padding: 6px 8px; border: 1px solid #E2E8F0; font-family: monospace; font-size: 9.5px; letter-spacing: 0.5px; color: #334155;">${r.accountNo || "-"}</td>
            <td style="padding: 6px 8px; border: 1px solid #E2E8F0; font-family: monospace; font-size: 9.5px; font-weight: 600; color: #334155;">${r.ifscCode || "-"}</td>
            <td style="padding: 6px 8px; border: 1px solid #E2E8F0; color: #334155;">${r.beneficiaryName || "-"}</td>
            <td style="padding: 6px 8px; border: 1px solid #E2E8F0; text-align: right; font-weight: 700; color: #047857; font-size: 10.5px;">
              ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(r.amount || 0)}
            </td>
            <td style="padding: 6px 8px; border: 1px solid #E2E8F0; font-size: 9px; color: #64748B;">${r.remarks || "-"}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr style="background: #F1F5F9; font-weight: 800; border-top: 2px solid #0F172A;">
          <td colspan="${isVendor ? 5 : 6}" style="padding: 8px 10px; border: 1px solid #CBD5E1; text-align: right; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; color: #0F172A;">
            Grand Total Net Payable:
          </td>
          <td style="padding: 8px 10px; border: 1px solid #CBD5E1; text-align: right; color: #047857; font-size: 11.5px; font-weight: 800;">
            ${formattedTotal}
          </td>
          <td style="padding: 8px 10px; border: 1px solid #CBD5E1;"></td>
        </tr>
      </tfoot>
    </table>

    <!-- Signature Authorization Block -->
    <div style="margin-top: 30px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; text-align: center; page-break-inside: avoid;">
      <div style="border-top: 1px solid #94A3B8; padding-top: 6px;">
        <div style="font-size: 10.5px; font-weight: 700; color: #1E293B;">Prepared By</div>
        <div style="font-size: 9px; color: #64748B; margin-top: 2px;">Accounts Executive</div>
      </div>
      <div style="border-top: 1px solid #94A3B8; padding-top: 6px;">
        <div style="font-size: 10.5px; font-weight: 700; color: #1E293B;">Verified & Checked By</div>
        <div style="font-size: 9px; color: #64748B; margin-top: 2px;">Finance Manager</div>
      </div>
      <div style="border-top: 1px solid #94A3B8; padding-top: 6px;">
        <div style="font-size: 10.5px; font-weight: 700; color: #1E293B;">Authorized Sign-Off</div>
        <div style="font-size: 9px; color: #64748B; margin-top: 2px;">Director / CEO</div>
      </div>
    </div>
  `;

  const opt: any = {
    margin: [8, 8, 8, 8],
    filename: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      logging: false
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "landscape"
    },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] }
  };

  html2pdf().set(opt).from(element).save();
}
