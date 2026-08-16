import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDepreciation, saveDepreciation } from '../api/budgetService';

export const useDepreciationQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['budget-depreciation', financialYear],
    queryFn: () => getDepreciation(financialYear),
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

export const useSaveDepreciationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, data }: { financialYear: string, data: any[] }) => saveDepreciation(financialYear, data),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['budget-depreciation', financialYear] });
      queryClient.invalidateQueries({ queryKey: ['budgetSummary'] });
      queryClient.invalidateQueries({ queryKey: ['actualVsBudget'] });
    },
  });
};
