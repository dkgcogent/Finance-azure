
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSalaryData, saveSalaryData } from '../api/budgetService';

export const useSalaryQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['salary', financialYear],
    queryFn: () => getSalaryData(financialYear),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSaveSalaryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, data }: { financialYear: string, data: any[] }) => saveSalaryData(financialYear, data),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['salary', financialYear] });
    },
  });
};
