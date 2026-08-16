
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSalaryData, saveSalaryData } from '../api/budgetService';

export const useSalaryQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['salary', financialYear],
    queryFn: () => getSalaryData(financialYear),
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

export const useSaveSalaryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, data }: { financialYear: string, data: any[] }) => saveSalaryData(financialYear, data),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['salary', financialYear] });
      queryClient.invalidateQueries({ queryKey: ['corporate', financialYear] });
      queryClient.invalidateQueries({ queryKey: ['budgetSummary'] });
      queryClient.invalidateQueries({ queryKey: ['actualVsBudget'] });
    },
  });
};
