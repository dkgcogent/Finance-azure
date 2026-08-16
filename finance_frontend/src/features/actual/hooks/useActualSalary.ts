
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActualSalary, saveActualSalary } from '../api/actualService';

export const useActualSalaryQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['actual-salary', financialYear],
    queryFn: () => getActualSalary(financialYear),
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

export const useSaveActualSalaryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, data }: { financialYear: string, data: any[] }) => saveActualSalary(financialYear, data),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['actual-salary', financialYear] });
      queryClient.invalidateQueries({ queryKey: ['ActualSummary'] });
      queryClient.invalidateQueries({ queryKey: ['actualVsBudget'] });
    },
  });
};
