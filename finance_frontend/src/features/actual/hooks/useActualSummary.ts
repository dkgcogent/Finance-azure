import { useQuery } from '@tanstack/react-query';
import { getActualSummary } from '../api/actualService';

export const useActualSummary = (financialYear: string) => {
  return useQuery({
    queryKey: ['ActualSummary', financialYear],
    queryFn: () => getActualSummary(financialYear),
    staleTime: 0,
    refetchOnMount: 'always',
  });
};
