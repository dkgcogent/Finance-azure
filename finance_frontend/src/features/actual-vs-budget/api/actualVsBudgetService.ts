import { apiClient } from "@/lib/api";

export type MonthKey = 'apr' | 'may' | 'jun' | 'jul' | 'aug' | 'sep' | 'oct' | 'nov' | 'dec' | 'jan' | 'feb' | 'mar';

export const MONTHS: { key: MonthKey, label: string }[] = [
  { key: 'apr', label: 'Apr' },
  { key: 'may', label: 'May' },
  { key: 'jun', label: 'Jun' },
  { key: 'jul', label: 'Jul' },
  { key: 'aug', label: 'Aug' },
  { key: 'sep', label: 'Sep' },
  { key: 'oct', label: 'Oct' },
  { key: 'nov', label: 'Nov' },
  { key: 'dec', label: 'Dec' },
  { key: 'jan', label: 'Jan' },
  { key: 'feb', label: 'Feb' },
  { key: 'mar', label: 'Mar' },
];

export const ROWS = [
  "Revenue",
  "Direct Expenses",
  "Gross Margin",
  "Gross Margin %Age",
  "Total Corporate Expenses",
  "Corporate Expenses % Age",
  "Total Bank Interest / Expenses",
  "Total Bank Interest / Expenses % Age",
  "EBITA",
  "EBITA %Age",
  "Deprication",
  "Income Tax",
  "NP",
  "NP % Age"
];

const generateMockActuals = (budgetData: any) => {
  const actuals: any = {};
  ROWS.forEach(row => {
    actuals[row] = MONTHS.map((_, i) => {
      const budgetVal = budgetData[row] ? budgetData[row][i] : 0;
      const isPct = row.includes('%');
      const variance = isPct ? (Math.random() * 4 - 2) : (budgetVal * (Math.random() * 0.4 - 0.2));
      return budgetVal + variance;
    });
  });
  return actuals;
}

export const getActualVsBudget = async (financialYear: string) => {
  const [budgetResponse, actualsResponse] = await Promise.all([
    apiClient.get(`/budget/summary?year=${financialYear}`),
    apiClient.get(`/actuals/summary?year=${financialYear}`)
  ]);
  
  const budgetData = budgetResponse.data.resultRows || budgetResponse.data;
  const actualData = actualsResponse.data.resultRows || actualsResponse.data;
  
  return { budgetData, actualData };
};
