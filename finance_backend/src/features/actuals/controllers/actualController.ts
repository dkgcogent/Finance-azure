import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middleware/auth';
import * as actualService from '../services/actualService';

// ==========================================
// 1. REVENUE & DIRECT EXPENSES INTEGRATION
// ==========================================
export const getRevenueDirectExpenses = async (req: AuthenticatedRequest, res: Response) => {
  const year = req.query.year as string;
  if (!year) return res.status(400).json({ message: 'Year parameter is required' });

  try {
    const data = await actualService.fetchRevenueDirectExpenses(year);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const saveRevenueDirectExpenses = async (req: AuthenticatedRequest, res: Response) => {
  const { year, groups } = req.body;
  if (!year || !Array.isArray(groups)) {
    return res.status(400).json({ message: 'Invalid request payload' });
  }

  try {
    const response = await actualService.upsertRevenueDirectExpenses(year, groups);
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// 2. CORPORATE EXPENSES INTEGRATION
// ==========================================
export const getCorporateExpenses = async (req: AuthenticatedRequest, res: Response) => {
  const year = req.query.year as string;
  if (!year) return res.status(400).json({ message: 'Year is required' });

  try {
    const data = await actualService.fetchCorporateExpenses(year);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const saveCorporateExpenses = async (req: AuthenticatedRequest, res: Response) => {
  const { year, data } = req.body;
  if (!year || !Array.isArray(data)) return res.status(400).json({ message: 'Invalid payload' });

  try {
    const response = await actualService.upsertCorporateExpenses(year, data);
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// 3. SALARY INTEGRATION
// ==========================================
export const getSalaries = async (req: AuthenticatedRequest, res: Response) => {
  const year = req.query.year as string;
  if (!year) return res.status(400).json({ message: 'Year is required' });

  try {
    const data = await actualService.fetchSalaries(year);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const saveSalaries = async (req: AuthenticatedRequest, res: Response) => {
  const { year, data } = req.body;
  if (!year || !Array.isArray(data)) return res.status(400).json({ message: 'Invalid payload' });

  try {
    const response = await actualService.upsertSalaries(year, data);
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// 4. BANK CHARGES INTEGRATION
// ==========================================
export const getBankCharges = async (req: AuthenticatedRequest, res: Response) => {
  const year = req.query.year as string;
  if (!year) return res.status(400).json({ message: 'Year is required' });

  try {
    const data = await actualService.fetchBankCharges(year);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const saveBankCharges = async (req: AuthenticatedRequest, res: Response) => {
  const { year, data } = req.body;
  if (!year || !Array.isArray(data)) return res.status(400).json({ message: 'Invalid payload' });

  try {
    const response = await actualService.upsertBankCharges(year, data);
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// 5. SUMMARY CONSOLIDATION & CALCULATIONS
// ==========================================
export const getSummary = async (req: AuthenticatedRequest, res: Response) => {
  const year = req.query.year as string;
  if (!year) return res.status(400).json({ message: 'Year parameter is required' });

  try {
    const data = await actualService.fetchSummary(year);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// 6. DEPRECIATION INTEGRATION
// ==========================================
export const getDepreciation = async (req: AuthenticatedRequest, res: Response) => {
  const year = req.query.year as string;
  if (!year) return res.status(400).json({ message: 'Year is required' });

  try {
    const data = await actualService.fetchDepreciation(year);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const saveDepreciation = async (req: AuthenticatedRequest, res: Response) => {
  const { year, data } = req.body;
  if (!year || !Array.isArray(data)) return res.status(400).json({ message: 'Invalid payload' });

  try {
    const response = await actualService.upsertDepreciation(year, data);
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// 7. AVAILABLE YEARS
// ==========================================
export const getAvailableYears = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await actualService.fetchAvailableYears();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
