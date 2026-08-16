import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRevenueData, saveRevenueData, getAvailableFinancialYears } from '../api/budgetService';

export const useAvailableYearsQuery = () => {
  return useQuery({
    queryKey: ['availableYears'],
    queryFn: getAvailableFinancialYears,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useRevenueQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['revenue', financialYear],
    queryFn: () => getRevenueData(financialYear),
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

export const useSaveRevenueMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, groups }: { financialYear: string, groups: any[] }) => saveRevenueData(financialYear, groups),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['revenue', financialYear] });
      queryClient.invalidateQueries({ queryKey: ['budgetSummary'] });
      queryClient.invalidateQueries({ queryKey: ['actualVsBudget'] });
    },
  });
};
