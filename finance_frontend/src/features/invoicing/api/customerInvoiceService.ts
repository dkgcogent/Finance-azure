import { API_BASE_URL } from '@/lib/api';

export type Invoice = {
  id: string
  invoiceNumber: string
  customerName: string
  date: string
  dueDate: string
  amount: number
  status: "Paid" | "Pending" | "Overdue" | "Draft" | "Cancelled"
  format: string
  annexure?: string
  azureBlobUrl?: string
  gstin?: string
  billing_address?: string
}


export const fetchCustomerInvoices = async (financialYear: string): Promise<Invoice[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/invoicing`);
    if (!response.ok) throw new Error('Failed to fetch invoices');
    return await response.json();
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
};

export const createCustomerInvoice = async (
  invoiceCustomer: string,
  options?: {
    customerName?: string;
    amount?: number;
    financialYear?: string;
    tripType?: string;
    html?: string;
    invoiceDate?: string;
  }
) => {
  const fy = options?.financialYear || '2025-2026';
  
  // To avoid hitting the DB just for generating an invoice number safely in a race condition,
  // we can use a temporary timestamp-based number if the backend doesn't handle sequence yet.
  // We'll generate a unique ID here for simplicity.
  const parts = fy.split('-');
  const shortYear = parts.length >= 2 ? `${parts[0].slice(-2)}-${parts[1].slice(-2)}` : '25-26';
  const prefix = `CLPL/${shortYear}/`;
  const randomNum = String(Math.floor(Math.random() * 999)).padStart(3, '0');
  const invoiceNumber = `${prefix}${randomNum}`;

  // Inject the dynamically generated invoice number into the HTML payload
  const modifiedHtml = options?.html ? options.html.replace(/CLPL\/25-26\/—/g, invoiceNumber) : undefined;

  const payload = {
    invoiceNumber,
    customerName: options?.customerName || invoiceCustomer || "Customer",
    date: options?.invoiceDate || new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: options?.amount || 0,
    status: "Pending",
    format: options?.tripType === 'Fixed' ? "Fixed SLA Format" : "Adhoc Format",
    financialYear: fy,
    html: modifiedHtml
  };

  const response = await fetch(`${API_BASE_URL}/invoicing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Failed to create invoice');
  }

  return await response.json();
};

export interface CustomerCNDN {
  id: number;
  noteNumber: string;
  type: 'cn' | 'dn';
  invoiceRef: string;
  amount: number;
  date: string;
  reason: string;
  remarks: string;
  status: string;
  azure_blob_url: string;
  customerOrVendor: string;
}

export const getCustomerCNDNs = async (): Promise<CustomerCNDN[]> => {
  const response = await fetch(`${API_BASE_URL}/invoicing/cndn/list`);
  if (!response.ok) throw new Error('Failed to fetch CN/DN notes');
  return await response.json();
};

export const saveCustomerCNDN = async (payload: {
  noteNumber: string;
  type: string;
  customerInvoiceRef: string;
  amount: number;
  date: string;
  reason: string;
  remarks: string;
  html?: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/invoicing/cndn/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('Failed to save CN/DN note');
  return await response.json();
};
