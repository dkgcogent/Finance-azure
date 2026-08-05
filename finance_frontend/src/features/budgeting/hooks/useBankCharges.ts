
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBankCharges, saveBankCharges } from '../api/budgetService';

export const useBankChargesQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['bank-charges', financialYear],
    queryFn: () => getBankCharges(financialYear),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSaveBankChargesMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, data }: { financialYear: string, data: any[] }) => saveBankCharges(financialYear, data),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['bank-charges', financialYear] });
    },
  });
};
