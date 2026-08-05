const fs = require('fs');
const path = require('path');

// 1. Update types/index.ts
const typesPath = 'src/features/budgeting/types/index.ts';
let typesContent = fs.readFileSync(typesPath, 'utf8');
if (!typesContent.includes('RevenueDataGroupSchema')) {
  typesContent += `
export const RevenueDataGroupSchema = z.object({
  customer: z.string(),
  project: z.string(),
  location: z.string(),
  revenueMonths: z.record(z.string(), z.number()),
  directExpensePctMonths: z.record(z.string(), z.number()),
});
export type RevenueDataGroup = z.infer<typeof RevenueDataGroupSchema>;

export const CorporateExpenseRowSchema = z.object({
  head: z.string(),
}).catchall(z.number());
export type CorporateExpenseRow = z.infer<typeof CorporateExpenseRowSchema>;
`;
  fs.writeFileSync(typesPath, typesContent);
}

// 2. Update api/budgetService.ts
const apiPath = 'src/features/budgeting/api/budgetService.ts';
let apiContent = fs.readFileSync(apiPath, 'utf8');
if (!apiContent.includes('getRevenueData')) {
  apiContent += `
export const getRevenueData = async (financialYear: string) => {
  return fetchAPI(\`/budget/revenue-direct-expense?year=\${financialYear}\`);
};
export const saveRevenueData = async (financialYear: string, groups: any[]) => {
  return fetchAPI('/budget/revenue-direct-expense', {
    method: 'POST',
    body: JSON.stringify({ year: financialYear, groups })
  });
};

export const getCorporateExpenses = async (financialYear: string) => {
  return fetchAPI(\`/budget/corporate-expenses?year=\${financialYear}\`);
};
export const saveCorporateExpenses = async (financialYear: string, data: any[]) => {
  return fetchAPI('/budget/corporate-expenses', {
    method: 'POST',
    body: JSON.stringify({ year: financialYear, data })
  });
};
`;
  fs.writeFileSync(apiPath, apiContent);
}

// 3. Create hooks
const hooksDir = 'src/features/budgeting/hooks';
fs.writeFileSync(path.join(hooksDir, 'useRevenueData.ts'), `
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRevenueData, saveRevenueData } from '../api/budgetService';

export const useRevenueQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['revenue', financialYear],
    queryFn: () => getRevenueData(financialYear),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSaveRevenueMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, groups }: { financialYear: string, groups: any[] }) => saveRevenueData(financialYear, groups),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['revenue', financialYear] });
    },
  });
};
`);

fs.writeFileSync(path.join(hooksDir, 'useCorporateExpenses.ts'), `
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCorporateExpenses, saveCorporateExpenses } from '../api/budgetService';

export const useCorporateQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['corporate', financialYear],
    queryFn: () => getCorporateExpenses(financialYear),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSaveCorporateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, data }: { financialYear: string, data: any[] }) => saveCorporateExpenses(financialYear, data),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['corporate', financialYear] });
    },
  });
};
`);

// Refactor UI Pages will be handled via replace_file_content separately, as they are very complex.
console.log("Types, API, and Hooks created.");
