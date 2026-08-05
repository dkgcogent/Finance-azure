
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActualRevenue, saveActualRevenue } from '../api/actualService';

export const useActualRevenueQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['actual-revenue', financialYear],
    queryFn: () => getActualRevenue(financialYear),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSaveActualRevenueMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, groups }: { financialYear: string, groups: any[] }) => saveActualRevenue(financialYear, groups),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['actual-revenue', financialYear] });
    },
  });
};

export const useAvailableYearsQuery = () => {
  return useQuery({
    queryKey: ['actual-available-years'],
    queryFn: async () => {
      const { apiClient } = await import('@/lib/api');
      const response = await apiClient.get('/actuals/available-years');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};
