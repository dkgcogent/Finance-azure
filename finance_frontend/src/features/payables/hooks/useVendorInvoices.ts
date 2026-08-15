import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorInvoiceService, Vendor, VendorInvoice } from '../api/vendorInvoiceService';

export const useVendors = () => {
  return useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: () => vendorInvoiceService.getVendors(),
  });
};

export const useVendorTrips = (vendorName: string, startDate: string, endDate: string, tripType: string, customerId?: string, projectId?: string, locationId?: string) => {
  return useQuery({
    queryKey: ['vendorTrips', vendorName, startDate, endDate, tripType, customerId, projectId, locationId],
    queryFn: () => vendorInvoiceService.getVendorTrips(vendorName, startDate, endDate, tripType, customerId, projectId, locationId),
    enabled: !!vendorName && !!startDate && !!endDate && !!tripType
  });
};

export const useVendorInvoices = () => {
  return useQuery<VendorInvoice[]>({
    queryKey: ['vendorInvoices'],
    queryFn: () => vendorInvoiceService.getVendorInvoices(),
  });
};

export const useCreateVendorInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: vendorInvoiceService.saveVendorInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorInvoices'] });
    },
  });
};

export const useVendorCNDNs = () => {
  return useQuery<any[]>({
    queryKey: ['vendorCNDNs'],
    queryFn: () => vendorInvoiceService.getVendorCNDNs(),
  });
};

export const useCreateVendorCNDN = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: vendorInvoiceService.saveVendorCNDN,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorCNDNs'] });
    },
  });
};
