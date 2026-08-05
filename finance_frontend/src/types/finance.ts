// Common Finance Types

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

export interface PaymentDetails {
  id: string;
  paymentDate: string;
  amount: number;
  paymentMethod: "Bank Transfer" | "Credit Card" | "Cash" | "Cheque";
  transactionId?: string;
  remarks?: string;
}

export interface Invoice {
  id: string
  invoiceNumber: string
  customerName: string
  date: string
  dueDate: string
  amount: number
  subtotal?: number
  taxAmount?: number
  items?: InvoiceLineItem[]
  payments?: PaymentDetails[]
  relatedCnDn?: {
    type: "Credit Note" | "Debit Note"
    number: string
    amount: number
    date: string
  }[]
  remarks?: string
  status: "Generated" | "Sent" | "Approved" | "Partially Paid" | "Final Payment" | "Cancelled"
  agingDays?: number
}

export interface VendorBill {
  id: string
  vendorName: string
  billNumber: string
  amount: number
  status: "Pending Verification" | "Approved" | "Rejected"
}

export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: any // For complex multi-line charts
}
