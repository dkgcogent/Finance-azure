import { z } from "zod";

export const BudgetSummaryChartDataSchema = z.object({
  name: z.string(),
  "Gross Margin %": z.number(),
  "Corporate Exp %": z.number(),
  "EBITA %": z.number(),
  "NP %": z.number(),
});

export const BudgetSummaryPieDataSchema = z.object({
  name: z.string(),
  value: z.number(),
  color: z.string(),
});

export const BudgetSummaryResponseSchema = z.object({
  chartData: z.array(BudgetSummaryChartDataSchema),
  pieData: z.array(BudgetSummaryPieDataSchema),
  headers: z.array(z.string()),
  resultRows: z.record(z.string(), z.array(z.number())).optional(),
});

export type BudgetSummaryChartData = z.infer<typeof BudgetSummaryChartDataSchema>;
export type BudgetSummaryPieData = z.infer<typeof BudgetSummaryPieDataSchema>;
export type BudgetSummaryResponse = z.infer<typeof BudgetSummaryResponseSchema>;

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

export const SalaryRowSchema = z.object({
  head: z.string(),
  customer: z.string().optional(),
  project: z.string().optional(),
  location: z.string().optional(),
  designation: z.string().optional(),
  nameOfEmployee: z.string().optional(),
}).catchall(z.number());
export type SalaryRowType = z.infer<typeof SalaryRowSchema>;

export const BankChargeRowSchema = z.object({
  head: z.string(),
}).catchall(z.number());
export type BankChargeRowType = z.infer<typeof BankChargeRowSchema>;
