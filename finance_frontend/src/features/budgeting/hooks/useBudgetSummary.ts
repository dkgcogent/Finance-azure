import { useQuery } from '@tanstack/react-query';
import { getBudgetSummary } from '../api/budgetService';

export const useBudgetSummary = (financialYear: string) => {
  return useQuery({
    queryKey: ['budgetSummary', financialYear],
    queryFn: () => getBudgetSummary(financialYear),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
