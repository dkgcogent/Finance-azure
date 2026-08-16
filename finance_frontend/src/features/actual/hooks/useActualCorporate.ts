
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActualCorporate, saveActualCorporate } from '../api/actualService';

export const useActualCorporateQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['actual-corporate', financialYear],
    queryFn: () => getActualCorporate(financialYear),
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

export const useSaveActualCorporateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, data }: { financialYear: string, data: any[] }) => saveActualCorporate(financialYear, data),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['actual-corporate', financialYear] });
      queryClient.invalidateQueries({ queryKey: ['ActualSummary'] });
      queryClient.invalidateQueries({ queryKey: ['actualVsBudget'] });
    },
  });
};
