import { apiClient } from "@/lib/api";

export const getActualRevenue = async (financialYear: string) => {
  const response = await apiClient.get(`/actuals/revenue-direct-expense?year=${financialYear}`);
  return response.data;
};
export const saveActualRevenue = async (financialYear: string, groups: any[]) => {
  const response = await apiClient.post('/actuals/revenue-direct-expense', { year: financialYear, groups });
  return response.data;
};

export const getActualCorporate = async (financialYear: string) => {
  const response = await apiClient.get(`/actuals/corporate-expenses?year=${financialYear}`);
  return response.data;
};
export const saveActualCorporate = async (financialYear: string, data: any[]) => {
  const response = await apiClient.post('/actuals/corporate-expenses', { year: financialYear, data });
  return response.data;
};

export const getDepreciation = async (financialYear: string) => {
  const response = await apiClient.get(`/actuals/depreciation?year=${financialYear}`);
  return response.data;
};

export const saveDepreciation = async (financialYear: string, data: any[]) => {
  const response = await apiClient.post('/actuals/depreciation', { year: financialYear, data });
  return response.data;
};

export const getActualSalary = async (financialYear: string) => {
  const response = await apiClient.get(`/actuals/salaries?year=${financialYear}`);
  return response.data;
};
export const saveActualSalary = async (financialYear: string, data: any[]) => {
  const response = await apiClient.post('/actuals/salaries', { year: financialYear, data });
  return response.data;
};

export const getActualBankCharges = async (financialYear: string) => {
  const response = await apiClient.get(`/actuals/bank-charges?year=${financialYear}`);
  return response.data;
};
export const saveActualBankCharges = async (financialYear: string, data: any[]) => {
  const response = await apiClient.post('/actuals/bank-charges', { year: financialYear, data });
  return response.data;
};

export const getActualSummary = async (financialYear: string) => {
  const response = await apiClient.get(`/actuals/summary?year=${financialYear}`);
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
      "Gross Margin Value": resultRows["Gross Margin"]?.[i] || 0,
      "Corporate Exp %": resultRows["Corporate Expenses % Age"]?.[i] || 0,
      "Corporate Exp Value": resultRows["Total Corporate Expenses"]?.[i] || 0,
      "EBITA %": resultRows["EBITA %Age"]?.[i] || 0,
      "EBITA Value": resultRows["EBITA"]?.[i] || 0,
      "NP %": resultRows["NP % Age"]?.[i] || 0,
      "NP Value": resultRows["NP"]?.[i] || 0
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
