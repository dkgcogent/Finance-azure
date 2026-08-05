
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
