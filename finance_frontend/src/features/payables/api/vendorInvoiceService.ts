import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';

export interface Vendor {
  id: number;
  name: string;
  type: string;
}

export interface VendorInvoice {
  id: number;
  invoice_number: string;
  vendor_name: string;
  date: string;
  due_date: string;
  amount: string;
  status: string;
  azure_blob_url: string | null;
  linked_customer_invoice: string | null;
  vendor_address?: string;
  account_holder_name?: string;
  account_number?: string;
  ifsc_code?: string;
  bank_name?: string;
  branch_name?: string;
}

export const vendorInvoiceService = {
  getVendors: async (): Promise<Vendor[]> => {
    const response = await axios.get(`${API_BASE_URL}/vendors`);
    return response.data;
  },

  getNextInvoiceNumber: async (): Promise<{ invoiceNumber: string }> => {
    const response = await axios.get(`${API_BASE_URL}/vendors/next-number`);
    return response.data;
  },

  getVendorTrips: async (vendorName: string, startDate: string, endDate: string, tripType: string, customerId?: string, projectId?: string, locationId?: string) => {
    const response = await axios.get(`${API_BASE_URL}/vendors/trips`, {
      params: { vendorName, startDate, endDate, tripType, customerId, projectId, locationId }
    });
    return response.data;
  },

  saveVendorInvoice: async (payload: {
    vendorName: string;
    amount: number;
    linkedCustomerInvoice: string;
    financialYear: string;
    azureUrl?: string;
    invoiceDate?: string;
    dueDate?: string;
    html?: string;
  }) => {
    const response = await axios.post(`${API_BASE_URL}/vendors/save`, payload);
    return response.data;
  },

  getVendorInvoices: async (): Promise<VendorInvoice[]> => {
    const response = await axios.get(`${API_BASE_URL}/vendors/invoices`);
    return response.data;
  },

  saveVendorCNDN: async (payload: {
    noteNumber: string;
    type: string;
    vendorInvoiceRef: string;
    amount: number;
    date: string;
    reason: string;
    remarks: string;
    html?: string;
  }) => {
    const response = await axios.post(`${API_BASE_URL}/vendors/cndn/save`, payload);
    return response.data;
  },

  getVendorCNDNs: async (): Promise<any[]> => {
    const response = await axios.get(`${API_BASE_URL}/vendors/cndn/list`);
    return response.data;
  }
};
