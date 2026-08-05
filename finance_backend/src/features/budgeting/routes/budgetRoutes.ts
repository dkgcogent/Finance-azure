import { Router } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import {
  getRevenueDirectExpenses,
  saveRevenueDirectExpenses,
  getCorporateExpenses,
  saveCorporateExpenses,
  getSalaries,
  saveSalaries,
  getBankCharges,
  saveBankCharges,
  getDepreciation,
  saveDepreciation,
  getSummary,
  getAvailableYears
} from '../controllers/budgetController';

const router = Router();

// Protect all routes - Temporarily disabled until auth is implemented
// router.use(authenticateToken);

router.get('/financial-years', getAvailableYears);

router.get('/revenue-direct-expense', getRevenueDirectExpenses);
router.post('/revenue-direct-expense', saveRevenueDirectExpenses);

router.get('/corporate-expenses', getCorporateExpenses);
router.post('/corporate-expenses', saveCorporateExpenses);

router.get('/salaries', getSalaries);
router.post('/salaries', saveSalaries);

router.get('/bank-charges', getBankCharges);
router.post('/bank-charges', saveBankCharges);

router.get('/depreciation', getDepreciation);
router.post('/depreciation', saveDepreciation);

router.get('/summary', getSummary);

export default router;
