import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDepreciation, saveDepreciation } from '../api/budgetService';

export const useDepreciationQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['budget-depreciation', financialYear],
    queryFn: () => getDepreciation(financialYear),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSaveDepreciationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, data }: { financialYear: string, data: any[] }) => saveDepreciation(financialYear, data),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['budget-depreciation', financialYear] });
    },
  });
};
