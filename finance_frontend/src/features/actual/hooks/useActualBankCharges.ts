
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActualBankCharges, saveActualBankCharges } from '../api/actualService';

export const useActualBankChargesQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['actual-bank-charges', financialYear],
    queryFn: () => getActualBankCharges(financialYear),
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

export const useSaveActualBankChargesMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, data }: { financialYear: string, data: any[] }) => saveActualBankCharges(financialYear, data),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['actual-bank-charges', financialYear] });
      queryClient.invalidateQueries({ queryKey: ['ActualSummary'] });
      queryClient.invalidateQueries({ queryKey: ['actualVsBudget'] });
    },
  });
};
