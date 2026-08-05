
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCorporateExpenses, saveCorporateExpenses } from '../api/budgetService';

export const useCorporateQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['corporate', financialYear],
    queryFn: () => getCorporateExpenses(financialYear),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSaveCorporateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, data }: { financialYear: string, data: any[] }) => saveCorporateExpenses(financialYear, data),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['corporate', financialYear] });
    },
  });
};
