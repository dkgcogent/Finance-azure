"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableYears = exports.saveDepreciation = exports.getDepreciation = exports.getSummary = exports.saveBankCharges = exports.getBankCharges = exports.saveSalaries = exports.getSalaries = exports.saveCorporateExpenses = exports.getCorporateExpenses = exports.saveRevenueDirectExpenses = exports.getRevenueDirectExpenses = void 0;
const actualService = __importStar(require("../services/actualService"));
// ==========================================
// 1. REVENUE & DIRECT EXPENSES INTEGRATION
// ==========================================
const getRevenueDirectExpenses = async (req, res) => {
    const year = req.query.year;
    if (!year)
        return res.status(400).json({ message: 'Year parameter is required' });
    try {
        const data = await actualService.fetchRevenueDirectExpenses(year);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getRevenueDirectExpenses = getRevenueDirectExpenses;
const saveRevenueDirectExpenses = async (req, res) => {
    const { year, groups } = req.body;
    if (!year || !Array.isArray(groups)) {
        return res.status(400).json({ message: 'Invalid request payload' });
    }
    try {
        const response = await actualService.upsertRevenueDirectExpenses(year, groups);
        res.json(response);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.saveRevenueDirectExpenses = saveRevenueDirectExpenses;
// ==========================================
// 2. CORPORATE EXPENSES INTEGRATION
// ==========================================
const getCorporateExpenses = async (req, res) => {
    const year = req.query.year;
    if (!year)
        return res.status(400).json({ message: 'Year is required' });
    try {
        const data = await actualService.fetchCorporateExpenses(year);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getCorporateExpenses = getCorporateExpenses;
const saveCorporateExpenses = async (req, res) => {
    const { year, data } = req.body;
    if (!year || !Array.isArray(data))
        return res.status(400).json({ message: 'Invalid payload' });
    try {
        const response = await actualService.upsertCorporateExpenses(year, data);
        res.json(response);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.saveCorporateExpenses = saveCorporateExpenses;
// ==========================================
// 3. SALARY INTEGRATION
// ==========================================
const getSalaries = async (req, res) => {
    const year = req.query.year;
    if (!year)
        return res.status(400).json({ message: 'Year is required' });
    try {
        const data = await actualService.fetchSalaries(year);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getSalaries = getSalaries;
const saveSalaries = async (req, res) => {
    const { year, data } = req.body;
    if (!year || !Array.isArray(data))
        return res.status(400).json({ message: 'Invalid payload' });
    try {
        const response = await actualService.upsertSalaries(year, data);
        res.json(response);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.saveSalaries = saveSalaries;
// ==========================================
// 4. BANK CHARGES INTEGRATION
// ==========================================
const getBankCharges = async (req, res) => {
    const year = req.query.year;
    if (!year)
        return res.status(400).json({ message: 'Year is required' });
    try {
        const data = await actualService.fetchBankCharges(year);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getBankCharges = getBankCharges;
const saveBankCharges = async (req, res) => {
    const { year, data } = req.body;
    if (!year || !Array.isArray(data))
        return res.status(400).json({ message: 'Invalid payload' });
    try {
        const response = await actualService.upsertBankCharges(year, data);
        res.json(response);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.saveBankCharges = saveBankCharges;
// ==========================================
// 5. SUMMARY CONSOLIDATION & CALCULATIONS
// ==========================================
const getSummary = async (req, res) => {
    const year = req.query.year;
    if (!year)
        return res.status(400).json({ message: 'Year parameter is required' });
    try {
        const data = await actualService.fetchSummary(year);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getSummary = getSummary;
// ==========================================
// 6. DEPRECIATION INTEGRATION
// ==========================================
const getDepreciation = async (req, res) => {
    const year = req.query.year;
    if (!year)
        return res.status(400).json({ message: 'Year is required' });
    try {
        const data = await actualService.fetchDepreciation(year);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getDepreciation = getDepreciation;
const saveDepreciation = async (req, res) => {
    const { year, data } = req.body;
    if (!year || !Array.isArray(data))
        return res.status(400).json({ message: 'Invalid payload' });
    try {
        const response = await actualService.upsertDepreciation(year, data);
        res.json(response);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.saveDepreciation = saveDepreciation;
// ==========================================
// 7. AVAILABLE YEARS
// ==========================================
const getAvailableYears = async (req, res) => {
    try {
        const data = await actualService.fetchAvailableYears();
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getAvailableYears = getAvailableYears;
