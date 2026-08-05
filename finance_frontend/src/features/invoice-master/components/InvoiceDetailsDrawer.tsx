import React from "react";
import { Drawer } from "@/components/ui/drawer";
import { Invoice } from "@/data/mockData";
import { formatCurrency, formatDate } from "@/utils/format";
import { Badge } from "@/components/ui/badge";

interface InvoiceDetailsDrawerProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceDetailsDrawer({ invoice, isOpen, onClose }: InvoiceDetailsDrawerProps) {
  if (!invoice) return null;

  const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">{title}</h3>
      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
        {children}
      </div>
    </div>
  );

  const Field = ({ label, value, fullWidth = false }: { label: string, value: React.ReactNode, fullWidth?: boolean }) => (
    <div className={`flex flex-col ${fullWidth ? 'col-span-2' : 'col-span-1'}`}>
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span className="text-sm text-gray-900">{value || "-"}</span>
    </div>
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Details: ${invoice.invoiceNo}`}>
      {/* Section F (Moved to top for visibility): Outstanding & Status */}
      <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-xs text-gray-500 font-medium">Current Outstanding</span>
            <div className="text-3xl font-bold text-gray-900">{formatCurrency(invoice.currentOutstanding)}</div>
          </div>
          <Badge variant={
            invoice.paymentStatus === "Fully Paid" ? "success" : 
            invoice.paymentStatus === "Outstanding" ? "error" : "warning"
          }>
            {invoice.paymentStatus}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-blue-100">
          <Field label="Payment Done Days" value={invoice.paymentDoneDays} />
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-medium">Payment Timing</span>
            {invoice.paymentOnTimeOrDelay ? (
              <Badge className="w-fit mt-1" variant={invoice.paymentOnTimeOrDelay === "On-time" ? "success" : "error"}>
                {invoice.paymentOnTimeOrDelay}
              </Badge>
            ) : "-"}
          </div>
        </div>
      </div>

      <Section title="A. Invoice Info">
        <Field label="From GST" value={invoice.fromGST} />
        <Field label="From GST No." value={invoice.fromGSTNo} />
        <Field label="Invoice Date" value={formatDate(invoice.invoiceDate)} />
        <Field label="Invoice Month" value={formatDate(invoice.invoiceMonth)} />
        <Field label="Fin Year" value={invoice.finYear} />
        <Field label="Service Month" value={formatDate(invoice.serviceMonth)} />
        <Field label="PO No." value={invoice.poNo} />
        <Field label="Invoice Upload Date" value={formatDate(invoice.invoiceUploadDate)} />
        <Field label="JMS Status" value={invoice.jmsStatus} />
        <Field label="JMS Number" value={invoice.jmsNumber} />
      </Section>

      <Section title="B. Party & Project">
        <Field label="Type" value={<Badge variant={invoice.type === "Customer" ? "customer" : "vendor"}>{invoice.type}</Badge>} />
        <Field label="Customer Name" value={invoice.customerName} />
        <Field label="Project" value={invoice.project} />
        <Field label="Project Work" value={invoice.projectWork} />
        <Field label="Location" value={invoice.location} />
        <Field label="Revenue Head" value={invoice.revenueHead} />
        <Field label="Credit Period (Days)" value={invoice.creditPeriodDays} />
        <Field label="Net Effective CP" value={invoice.netEffectiveCreditPeriod} />
      </Section>

      <Section title="C. Amount & Tax Breakdown">
        <div className="col-span-2 overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b"><td className="py-1 text-gray-500">Invoice Amount</td><td className="py-1 text-right">{formatCurrency(invoice.invoiceAmount)}</td></tr>
              <tr className="border-b"><td className="py-1 text-gray-500">IGST</td><td className="py-1 text-right">{formatCurrency(invoice.igst)}</td></tr>
              <tr className="border-b"><td className="py-1 text-gray-500">SGST</td><td className="py-1 text-right">{formatCurrency(invoice.sgst)}</td></tr>
              <tr className="border-b"><td className="py-1 text-gray-500">CGST</td><td className="py-1 text-right">{formatCurrency(invoice.cgst)}</td></tr>
              <tr className="border-b font-medium"><td className="py-1 text-gray-700">Total GST</td><td className="py-1 text-right">{formatCurrency(invoice.totalGST)}</td></tr>
              <tr className="border-b"><td className="py-1 text-gray-500">Total Invoice Amt</td><td className="py-1 text-right">{formatCurrency(invoice.totalInvoiceAmt)}</td></tr>
              <tr className="border-b text-red-600"><td className="py-1">TDS Deducted</td><td className="py-1 text-right">-{formatCurrency(invoice.tdsDeducted)}</td></tr>
              <tr className="font-bold text-base"><td className="py-2">Final Payable</td><td className="py-2 text-right">{formatCurrency(invoice.finalPayable)}</td></tr>
              <tr><td className="py-1 text-gray-500">Due Date</td><td className="py-1 text-right">{formatDate(invoice.dueDate)}</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="D. Payment Tracking">
        <div className="col-span-2 space-y-3">
          {/* Payment 1 */}
          <div className="flex justify-between items-center bg-white p-2 rounded border">
            <div>
              <div className="text-xs text-gray-500">1st Payment</div>
              <div className="text-sm font-medium">{formatDate(invoice.payment1Date)}</div>
              <div className="text-xs text-gray-400">Advice: {invoice.payment1AdviceNo || "-"}</div>
            </div>
            <div className="text-right font-medium">{formatCurrency(invoice.payment1Amount)}</div>
          </div>
          {/* Payment 2 */}
          <div className="flex justify-between items-center bg-white p-2 rounded border">
            <div>
              <div className="text-xs text-gray-500">2nd Payment</div>
              <div className="text-sm font-medium">{formatDate(invoice.payment2Date)}</div>
              <div className="text-xs text-gray-400">Advice: {invoice.payment2AdviceNo || "-"}</div>
            </div>
            <div className="text-right font-medium">{formatCurrency(invoice.payment2Amount)}</div>
          </div>
          {/* Payment 3 */}
          <div className="flex justify-between items-center bg-white p-2 rounded border">
            <div>
              <div className="text-xs text-gray-500">3rd Payment</div>
              <div className="text-sm font-medium">{formatDate(invoice.payment3Date)}</div>
              <div className="text-xs text-gray-400">Advice: {invoice.payment3AdviceNo || "-"}</div>
            </div>
            <div className="text-right font-medium">{formatCurrency(invoice.payment3Amount)}</div>
          </div>
          <div className="pt-2 border-t flex justify-between font-bold">
            <span>Total Payment Received</span>
            <span>{formatCurrency(invoice.totalPaymentReceived)}</span>
          </div>
        </div>
      </Section>

      {(invoice.cnNo || invoice.totalCNAmount) && (
        <Section title="E. Credit Note">
          <Field label="CN No." value={invoice.cnNo} />
          <Field label="CN Amount" value={formatCurrency(invoice.cnAmount)} />
          <Field label="IGST (CN)" value={formatCurrency(invoice.cnIGST)} />
          <Field label="CGST (CN)" value={formatCurrency(invoice.cnCGST)} />
          <Field label="SGST (CN)" value={formatCurrency(invoice.cnSGST)} />
          <Field label="Total GST (CN)" value={formatCurrency(invoice.cnTotalGST)} />
          <Field label="Total CN Amount" value={formatCurrency(invoice.totalCNAmount)} fullWidth />
        </Section>
      )}
    </Drawer>
  );
}
