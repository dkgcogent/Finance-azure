import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCustomerInvoices, createCustomerInvoice } from '../api/customerInvoiceService';

export const useCustomerInvoices = (financialYear: string) => {
  return useQuery({
    queryKey: ['customer-invoices', financialYear],
    queryFn: () => fetchCustomerInvoices(financialYear),
    enabled: !!financialYear,
  });
};

export const useCreateCustomerInvoice = (financialYear: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, options }: { customerId: string; options?: any }) =>
      createCustomerInvoice(customerId, { ...options, financialYear }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-invoices', financialYear] });
    },
  });
};

export const useCustomerCNDNs = () => {
  return useQuery({
    queryKey: ['customer-cndns'],
    queryFn: () => import('../api/customerInvoiceService').then(m => m.getCustomerCNDNs()),
  });
};

export const useCreateCustomerCNDN = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => import('../api/customerInvoiceService').then(m => m.saveCustomerCNDN(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-cndns'] });
    },
  });
};
