import { apiClient } from "@/lib/api";
import { BudgetSummaryResponse } from "../../../budgeting/types";

export const getAvailableFinancialYears = async (): Promise<string[]> => {
  const response = await apiClient.get('/budget/financial-years');
  return response.data;
};

export const getBudgetSummary = async (financialYear: string): Promise<BudgetSummaryResponse> => {
  const response = await apiClient.get(`/budget/summary?year=${financialYear}`);
  const resultRows = response.data;

  const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const headers = MONTHS.map((m, i) => {
    const [startYear, endYear] = financialYear.split('-');
    const sy = startYear?.substring(2) || '26';
    const ey = endYear?.substring(2) || '27';
    const y = i < 9 ? sy : ey;
    return `${m}-${y}`;
  });

  const chartData = headers.map((h, i) => {
    return {
      name: h,
      "Gross Margin %": resultRows["Gross Margin %Age"]?.[i] || 0,
      "Corporate Exp %": resultRows["Corporate Expenses % Age"]?.[i] || 0,
      "EBITA %": resultRows["EBITA %Age"]?.[i] || 0,
      "NP %": resultRows["NP % Age"]?.[i] || 0
    };
  });

  const avg = (arr: number[]) => arr && arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const pieData = [
    { name: "Gross Margin %", value: avg(resultRows["Gross Margin %Age"] || []), color: "#3b82f6" },
    { name: "Corporate Exp %", value: avg(resultRows["Corporate Expenses % Age"] || []), color: "#ef4444" },
    { name: "EBITA %", value: avg(resultRows["EBITA %Age"] || []), color: "#10b981" },
    { name: "NP %", value: avg(resultRows["NP % Age"] || []), color: "#f59e0b" },
  ];

  return { chartData, pieData, headers, resultRows };
};

export const getRevenueData = async (financialYear: string) => {
  const response = await apiClient.get(`/budget/revenue-direct-expense?year=${financialYear}`);
  return response.data;
};
export const saveRevenueData = async (financialYear: string, groups: any[]) => {
  const response = await apiClient.post('/budget/revenue-direct-expense', { year: financialYear, groups });
  return response.data;
};

export const getCorporateExpenses = async (financialYear: string) => {
  const response = await apiClient.get(`/budget/corporate-expenses?year=${financialYear}`);
  return response.data;
};
export const saveCorporateExpenses = async (financialYear: string, data: any[]) => {
  const response = await apiClient.post('/budget/corporate-expenses', { year: financialYear, data });
  return response.data;
};

export const getSalaryData = async (financialYear: string) => {
  const response = await apiClient.get(`/budget/salaries?year=${financialYear}`);
  return response.data;
};
export const saveSalaryData = async (financialYear: string, data: any[]) => {
  const response = await apiClient.post('/budget/salaries', { year: financialYear, data });
  return response.data;
};

export const getBankCharges = async (financialYear: string) => {
  const response = await apiClient.get(`/budget/bank-charges?year=${financialYear}`);
  return response.data;
};
export const saveBankCharges = async (financialYear: string, data: any[]) => {
  const response = await apiClient.post('/budget/bank-charges', { year: financialYear, data });
  return response.data;
};
