import { useQuery } from '@tanstack/react-query';
import { fetchInvoices } from '../api/invoiceService';

export const useInvoices = (financialYear: string) => {
  return useQuery({
    queryKey: ['invoices', financialYear],
    queryFn: () => fetchInvoices(financialYear),
    enabled: !!financialYear,
  });
};
