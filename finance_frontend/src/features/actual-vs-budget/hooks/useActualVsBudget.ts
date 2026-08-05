import { useQuery } from '@tanstack/react-query';
import { getActualVsBudget } from '../api/actualVsBudgetService';

export const useActualVsBudget = (financialYear: string) => {
  return useQuery({
    queryKey: ['actual-vs-budget', financialYear],
    queryFn: () => getActualVsBudget(financialYear),
    enabled: !!financialYear,
  });
};
