import { mockData, Invoice } from "@/data/mockData";

export const fetchInvoices = async (financialYear: string): Promise<Invoice[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Filter mock data by financial year (if finYear is present in mockData)
      // We will fallback to mockData if no finYear matched, so UI isn't completely empty for demo purposes if mock data has wrong years
      const filtered = mockData.filter(inv => inv.finYear === (financialYear.substring(0,4) + '-' + financialYear.substring(7)));
      // Note: financialYear is "2026-2027", but mockData has "2026-27"
      resolve(filtered.length > 0 ? filtered : mockData); 
    }, 800);
  });
};
