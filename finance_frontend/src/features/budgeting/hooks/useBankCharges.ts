
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBankCharges, saveBankCharges } from '../api/budgetService';

export const useBankChargesQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['bank-charges', financialYear],
    queryFn: () => getBankCharges(financialYear),
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

export const useSaveBankChargesMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, data }: { financialYear: string, data: any[] }) => saveBankCharges(financialYear, data),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['bank-charges', financialYear] });
      queryClient.invalidateQueries({ queryKey: ['budgetSummary'] });
      queryClient.invalidateQueries({ queryKey: ['actualVsBudget'] });
    },
  });
};
