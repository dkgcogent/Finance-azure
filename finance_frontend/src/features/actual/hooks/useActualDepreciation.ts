import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDepreciation, saveDepreciation } from '../api/actualService';

export const useActualDepreciationQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['actual-depreciation', financialYear],
    queryFn: () => getDepreciation(financialYear),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSaveActualDepreciationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, data }: { financialYear: string, data: any[] }) => saveDepreciation(financialYear, data),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['actual-depreciation', financialYear] });
    },
  });
};
