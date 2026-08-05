const fs = require('fs');
const path = require('path');

// 1. Types
const typesDir = path.join(__dirname, 'src/features/actual/types');
if (!fs.existsSync(typesDir)) {
  fs.mkdirSync(typesDir, { recursive: true });
}
const typesContent = `
import { z } from 'zod';
import { 
  RevenueDataGroupSchema, RevenueDataGroup,
  CorporateExpenseRowSchema, CorporateExpenseRow,
  SalaryRowSchema, SalaryRowType,
  BankChargeRowSchema, BankChargeRowType,
} from '../../budgeting/types';

// We can reuse the exact same schemas from budgeting since the payloads are identical
export {
  RevenueDataGroupSchema,
  CorporateExpenseRowSchema,
  SalaryRowSchema,
  BankChargeRowSchema
};
export type {
  RevenueDataGroup,
  CorporateExpenseRow,
  SalaryRowType,
  BankChargeRowType
};
`;
fs.writeFileSync(path.join(typesDir, 'index.ts'), typesContent);

// 2. API Service
const apiDir = path.join(__dirname, 'src/features/actual/api');
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}
const apiContent = `
import { fetchAPI } from '@/lib/api';

export const getActualRevenue = async (financialYear: string) => {
  return fetchAPI(\`/actual/revenue-direct-expense?year=\${financialYear}\`);
};
export const saveActualRevenue = async (financialYear: string, groups: any[]) => {
  return fetchAPI('/actual/revenue-direct-expense', {
    method: 'POST',
    body: JSON.stringify({ year: financialYear, groups })
  });
};

export const getActualCorporate = async (financialYear: string) => {
  return fetchAPI(\`/actual/corporate-expenses?year=\${financialYear}\`);
};
export const saveActualCorporate = async (financialYear: string, data: any[]) => {
  return fetchAPI('/actual/corporate-expenses', {
    method: 'POST',
    body: JSON.stringify({ year: financialYear, data })
  });
};

export const getActualSalary = async (financialYear: string) => {
  return fetchAPI(\`/actual/salaries?year=\${financialYear}\`);
};
export const saveActualSalary = async (financialYear: string, data: any[]) => {
  return fetchAPI('/actual/salaries', {
    method: 'POST',
    body: JSON.stringify({ year: financialYear, data })
  });
};

export const getActualBankCharges = async (financialYear: string) => {
  return fetchAPI(\`/actual/bank-charges?year=\${financialYear}\`);
};
export const saveActualBankCharges = async (financialYear: string, data: any[]) => {
  return fetchAPI('/actual/bank-charges', {
    method: 'POST',
    body: JSON.stringify({ year: financialYear, data })
  });
};
`;
fs.writeFileSync(path.join(apiDir, 'actualService.ts'), apiContent);

// 3. Hooks
const hooksDir = path.join(__dirname, 'src/features/actual/hooks');
if (!fs.existsSync(hooksDir)) {
  fs.mkdirSync(hooksDir, { recursive: true });
}

// useActualRevenue.ts
fs.writeFileSync(path.join(hooksDir, 'useActualRevenue.ts'), `
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActualRevenue, saveActualRevenue } from '../api/actualService';

export const useActualRevenueQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['actual-revenue', financialYear],
    queryFn: () => getActualRevenue(financialYear),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSaveActualRevenueMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, groups }: { financialYear: string, groups: any[] }) => saveActualRevenue(financialYear, groups),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['actual-revenue', financialYear] });
    },
  });
};
`);

// useActualCorporate.ts
fs.writeFileSync(path.join(hooksDir, 'useActualCorporate.ts'), `
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActualCorporate, saveActualCorporate } from '../api/actualService';

export const useActualCorporateQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['actual-corporate', financialYear],
    queryFn: () => getActualCorporate(financialYear),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSaveActualCorporateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, data }: { financialYear: string, data: any[] }) => saveActualCorporate(financialYear, data),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['actual-corporate', financialYear] });
    },
  });
};
`);

// useActualSalary.ts
fs.writeFileSync(path.join(hooksDir, 'useActualSalary.ts'), `
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActualSalary, saveActualSalary } from '../api/actualService';

export const useActualSalaryQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['actual-salary', financialYear],
    queryFn: () => getActualSalary(financialYear),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSaveActualSalaryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, data }: { financialYear: string, data: any[] }) => saveActualSalary(financialYear, data),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['actual-salary', financialYear] });
    },
  });
};
`);

// useActualBankCharges.ts
fs.writeFileSync(path.join(hooksDir, 'useActualBankCharges.ts'), `
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActualBankCharges, saveActualBankCharges } from '../api/actualService';

export const useActualBankChargesQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['actual-bank-charges', financialYear],
    queryFn: () => getActualBankCharges(financialYear),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSaveActualBankChargesMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, data }: { financialYear: string, data: any[] }) => saveActualBankCharges(financialYear, data),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['actual-bank-charges', financialYear] });
    },
  });
};
`);

console.log("Actual module Setup completed.");
