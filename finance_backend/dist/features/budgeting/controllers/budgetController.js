"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableYears = exports.getSummary = exports.saveBankCharges = exports.getBankCharges = exports.saveSalaries = exports.getSalaries = exports.saveCorporateExpenses = exports.getCorporateExpenses = exports.saveRevenueDirectExpenses = exports.getRevenueDirectExpenses = void 0;
const database_1 = require("../../../config/database");
const MONTHS = ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar'];
// ==========================================
// 1. REVENUE & DIRECT EXPENSES INTEGRATION
// ==========================================
const getRevenueDirectExpenses = async (req, res) => {
    const { year } = req.query;
    if (!year)
        return res.status(400).json({ message: 'Year parameter is required' });
    try {
        const [rows] = await database_1.db.query('SELECT * FROM budget_revenue_direct_expenses WHERE financial_year = ?', [year]);
        // Group items back to the layout format expected by the frontend
        const groupedData = {};
        rows.forEach((row) => {
            const groupKey = `${row.customer}-${row.project}-${row.location}`;
            if (!groupedData[groupKey]) {
                groupedData[groupKey] = {
                    customer: row.customer,
                    project: row.project,
                    location: row.location,
                    year: row.financial_year,
                    revenueMonths: {},
                    directExpensePctMonths: {}
                };
            }
            groupedData[groupKey].revenueMonths[row.month] = parseFloat(row.revenue);
            groupedData[groupKey].directExpensePctMonths[row.month] = parseFloat(row.direct_expense_pct);
        });
        res.json(Object.values(groupedData));
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
    const connection = await database_1.db.getConnection();
    try {
        await connection.beginTransaction();
        let totalRevenue = 0;
        let totalDirectExpense = 0;
        for (const group of groups) {
            const { customer, project, location } = group;
            let groupTotalRevenue = 0;
            let groupTotalDirectExpense = 0;
            for (const month of MONTHS) {
                const revenue = group.revenueMonths?.[month] || 0.00;
                const pct = group.directExpensePctMonths?.[month] || 0.00;
                if (revenue === 0 && pct === 0) {
                    await connection.query(`DELETE FROM budget_revenue_direct_expenses WHERE financial_year = ? AND customer = ? AND project = ? AND location = ? AND month = ?`, [year, customer, project, location, month]);
                }
                else {
                    await connection.query(`INSERT INTO budget_revenue_direct_expenses 
              (financial_year, customer, project, location, month, revenue, direct_expense_pct) 
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE revenue = VALUES(revenue), direct_expense_pct = VALUES(direct_expense_pct)`, [year, customer, project, location, month, revenue, pct]);
                    groupTotalRevenue += revenue;
                    groupTotalDirectExpense += (revenue * pct) / 100;
                }
            }
            totalRevenue += groupTotalRevenue;
            totalDirectExpense += groupTotalDirectExpense;
        }
        // Save totals for Revenue Direct Expenses
        await connection.query(`INSERT INTO budget_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`, [year, 'RevenueDirectExpense', 'Total Revenue', totalRevenue]);
        await connection.query(`INSERT INTO budget_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`, [year, 'RevenueDirectExpense', 'Total Direct Expenses', totalDirectExpense]);
        await connection.commit();
        res.json({ message: 'Revenue and Direct Expenses saved successfully' });
    }
    catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    }
    finally {
        connection.release();
    }
};
exports.saveRevenueDirectExpenses = saveRevenueDirectExpenses;
// ==========================================
// 2. CORPORATE EXPENSES INTEGRATION
// ==========================================
const getCorporateExpenses = async (req, res) => {
    const { year } = req.query;
    if (!year)
        return res.status(400).json({ message: 'Year is required' });
    try {
        const [rows] = await database_1.db.query('SELECT * FROM budget_corporate_expenses WHERE financial_year = ?', [year]);
        const grouped = {};
        rows.forEach((row) => {
            if (!grouped[row.head]) {
                grouped[row.head] = { head: row.head, year: row.financial_year };
            }
            grouped[row.head][row.month] = parseFloat(row.amount);
        });
        res.json(Object.values(grouped));
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
    const connection = await database_1.db.getConnection();
    try {
        await connection.beginTransaction();
        let moduleTotal = 0;
        for (const row of data) {
            let headTotal = 0;
            for (const month of MONTHS) {
                const amount = row[month] || 0.00;
                if (amount === 0) {
                    await connection.query(`DELETE FROM budget_corporate_expenses WHERE financial_year = ? AND head = ? AND month = ?`, [year, row.head, month]);
                }
                else {
                    await connection.query(`INSERT INTO budget_corporate_expenses (financial_year, head, month, amount)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE amount = VALUES(amount)`, [year, row.head, month, amount]);
                    headTotal += amount;
                    moduleTotal += amount;
                }
            }
            // Save individual head total
            await connection.query(`INSERT INTO budget_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`, [year, 'CorporateExpenses', row.head, headTotal]);
        }
        // Save grand total
        await connection.query(`INSERT INTO budget_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`, [year, 'CorporateExpenses', 'Grand Total', moduleTotal]);
        await connection.commit();
        res.json({ message: 'Corporate expenses saved successfully' });
    }
    catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    }
    finally {
        connection.release();
    }
};
exports.saveCorporateExpenses = saveCorporateExpenses;
// ==========================================
// 3. SALARY INTEGRATION
// ==========================================
const getSalaries = async (req, res) => {
    const { year } = req.query;
    if (!year)
        return res.status(400).json({ message: 'Year is required' });
    try {
        const [rows] = await database_1.db.query('SELECT * FROM budget_salaries WHERE financial_year = ?', [year]);
        const grouped = {};
        rows.forEach((row) => {
            const key = `${row.head}-${row.customer}-${row.project}-${row.location}-${row.designation}-${row.name_of_employee}`;
            if (!grouped[key]) {
                grouped[key] = {
                    head: row.head,
                    customer: row.customer,
                    project: row.project,
                    location: row.location,
                    designation: row.designation,
                    nameOfEmployee: row.name_of_employee,
                    year: row.financial_year
                };
            }
            grouped[key][row.month] = parseFloat(row.amount);
        });
        res.json(Object.values(grouped));
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
    const connection = await database_1.db.getConnection();
    try {
        await connection.beginTransaction();
        let moduleTotal = 0;
        const headTotals = {};
        for (const row of data) {
            if (!headTotals[row.head])
                headTotals[row.head] = 0;
            for (const month of MONTHS) {
                const amount = row[month] || 0.00;
                if (amount === 0) {
                    await connection.query(`DELETE FROM budget_salaries WHERE financial_year = ? AND head = ? AND customer = ? AND project = ? AND location = ? AND designation = ? AND name_of_employee = ? AND month = ?`, [year, row.head, row.customer, row.project, row.location, row.designation, row.nameOfEmployee, month]);
                }
                else {
                    await connection.query(`INSERT INTO budget_salaries (financial_year, head, customer, project, location, designation, name_of_employee, month, amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE amount = VALUES(amount)`, [year, row.head, row.customer, row.project, row.location, row.designation, row.nameOfEmployee, month, amount]);
                    headTotals[row.head] += amount;
                    moduleTotal += amount;
                }
            }
        }
        // Save individual head totals
        for (const [head, total] of Object.entries(headTotals)) {
            await connection.query(`INSERT INTO budget_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`, [year, 'Salaries', head, total]);
        }
        // Save grand total
        await connection.query(`INSERT INTO budget_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`, [year, 'Salaries', 'Grand Total', moduleTotal]);
        await connection.commit();
        res.json({ message: 'Salaries saved successfully' });
    }
    catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    }
    finally {
        connection.release();
    }
};
exports.saveSalaries = saveSalaries;
// ==========================================
// 4. BANK CHARGES INTEGRATION
// ==========================================
const getBankCharges = async (req, res) => {
    const { year } = req.query;
    if (!year)
        return res.status(400).json({ message: 'Year is required' });
    try {
        const [rows] = await database_1.db.query('SELECT * FROM budget_bank_charges WHERE financial_year = ?', [year]);
        const grouped = {};
        rows.forEach((row) => {
            if (!grouped[row.head]) {
                grouped[row.head] = { head: row.head, year: row.financial_year };
            }
            grouped[row.head][row.month] = parseFloat(row.amount);
        });
        res.json(Object.values(grouped));
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
    const connection = await database_1.db.getConnection();
    try {
        await connection.beginTransaction();
        let moduleTotal = 0;
        for (const row of data) {
            let headTotal = 0;
            for (const month of MONTHS) {
                const amount = row[month] || 0.00;
                if (amount === 0) {
                    await connection.query(`DELETE FROM budget_bank_charges WHERE financial_year = ? AND head = ? AND month = ?`, [year, row.head, month]);
                }
                else {
                    await connection.query(`INSERT INTO budget_bank_charges (financial_year, head, month, amount)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE amount = VALUES(amount)`, [year, row.head, month, amount]);
                    headTotal += amount;
                    moduleTotal += amount;
                }
            }
            // Save individual head total
            await connection.query(`INSERT INTO budget_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`, [year, 'BankCharges', row.head, headTotal]);
        }
        // Save grand total
        await connection.query(`INSERT INTO budget_totals (financial_year, module_name, head_name, total_amount) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`, [year, 'BankCharges', 'Grand Total', moduleTotal]);
        await connection.commit();
        res.json({ message: 'Bank Charges saved successfully' });
    }
    catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    }
    finally {
        connection.release();
    }
};
exports.saveBankCharges = saveBankCharges;
// ==========================================
// 5. SUMMARY CONSOLIDATION & CALCULATIONS
// ==========================================
const getSummary = async (req, res) => {
    const { year } = req.query;
    if (!year)
        return res.status(400).json({ message: 'Year parameter is required' });
    try {
        // 1. Fetch Revenue & Pct
        const [revExpRows] = await database_1.db.query('SELECT month, revenue, direct_expense_pct FROM budget_revenue_direct_expenses WHERE financial_year = ?', [year]);
        // 2. Fetch Corporate Expenses
        const [corpRows] = await database_1.db.query('SELECT month, SUM(amount) as total_corp FROM budget_corporate_expenses WHERE financial_year = ? GROUP BY month', [year]);
        // 3. Fetch Bank Charges
        const [bankRows] = await database_1.db.query('SELECT month, SUM(amount) as total_bank FROM budget_bank_charges WHERE financial_year = ? GROUP BY month', [year]);
        // 4. Fetch Depreciation/Tax manual inputs
        const [summaryInputRows] = await database_1.db.query('SELECT month, depreciation, income_tax FROM summary_inputs WHERE financial_year = ?', [year]);
        // Initialize month calculation structure
        const monthlySummary = {};
        MONTHS.forEach(m => {
            monthlySummary[m] = {
                revenue: 0,
                directExpenses: 0,
                corporateExpenses: 0,
                bankInterest: 0,
                depreciation: 0,
                incomeTax: 0
            };
        });
        // Populate calculations
        revExpRows.forEach((r) => {
            const m = r.month;
            const rev = parseFloat(r.revenue) || 0;
            const pct = parseFloat(r.direct_expense_pct) || 0;
            monthlySummary[m].revenue += rev;
            monthlySummary[m].directExpenses += (rev * pct) / 100;
        });
        corpRows.forEach((r) => {
            const m = r.month;
            monthlySummary[m].corporateExpenses += parseFloat(r.total_corp) || 0;
        });
        bankRows.forEach((r) => {
            const m = r.month;
            monthlySummary[m].bankInterest += parseFloat(r.total_bank) || 0;
        });
        summaryInputRows.forEach((r) => {
            const m = r.month;
            monthlySummary[m].depreciation += parseFloat(r.depreciation) || 0;
            monthlySummary[m].incomeTax += parseFloat(r.income_tax) || 0;
        });
        // Consolidate row values dynamically matching frontend rules
        const resultRows = {
            'Revenue': MONTHS.map(m => monthlySummary[m].revenue),
            'Direct Expenses': MONTHS.map(m => monthlySummary[m].directExpenses),
            'Gross Margin': MONTHS.map(m => monthlySummary[m].revenue - monthlySummary[m].directExpenses),
            'Gross Margin %Age': MONTHS.map(m => {
                const rev = monthlySummary[m].revenue;
                return rev > 0 ? ((rev - monthlySummary[m].directExpenses) / rev) * 100 : 0;
            }),
            'Total Corporate Expenses': MONTHS.map(m => monthlySummary[m].corporateExpenses),
            'Corporate Expenses % Age': MONTHS.map(m => {
                const rev = monthlySummary[m].revenue;
                return rev > 0 ? (monthlySummary[m].corporateExpenses / rev) * 100 : 0;
            }),
            'Total Bank Interest / Expenses': MONTHS.map(m => monthlySummary[m].bankInterest),
            'Total Bank Interest / Expenses % Age': MONTHS.map(m => {
                const rev = monthlySummary[m].revenue;
                return rev > 0 ? (monthlySummary[m].bankInterest / rev) * 100 : 0;
            }),
            'EBITA': MONTHS.map(m => {
                const gm = monthlySummary[m].revenue - monthlySummary[m].directExpenses;
                return gm - monthlySummary[m].corporateExpenses;
            }),
            'EBITA %Age': MONTHS.map(m => {
                const rev = monthlySummary[m].revenue;
                const ebita = (monthlySummary[m].revenue - monthlySummary[m].directExpenses) - monthlySummary[m].corporateExpenses;
                return rev > 0 ? (ebita / rev) * 100 : 0;
            }),
            'Deprication': MONTHS.map(m => monthlySummary[m].depreciation),
            'Income Tax': MONTHS.map(m => monthlySummary[m].incomeTax),
            'NP': MONTHS.map(m => {
                const ebita = (monthlySummary[m].revenue - monthlySummary[m].directExpenses) - monthlySummary[m].corporateExpenses;
                return ebita - monthlySummary[m].depreciation - monthlySummary[m].incomeTax;
            }),
            'NP % Age': MONTHS.map(m => {
                const rev = monthlySummary[m].revenue;
                const ebita = (monthlySummary[m].revenue - monthlySummary[m].directExpenses) - monthlySummary[m].corporateExpenses;
                const np = ebita - monthlySummary[m].depreciation - monthlySummary[m].incomeTax;
                return rev > 0 ? (np / rev) * 100 : 0;
            })
        };
        res.json(resultRows);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getSummary = getSummary;
// ==========================================
// 6. AVAILABLE YEARS
// ==========================================
const getAvailableYears = async (req, res) => {
    try {
        const [rows] = await database_1.db.query(`
      SELECT financial_year FROM budget_revenue_direct_expenses
      UNION
      SELECT financial_year FROM budget_corporate_expenses
      UNION
      SELECT financial_year FROM budget_salaries
      UNION
      SELECT financial_year FROM budget_bank_charges
      UNION
      SELECT financial_year FROM budget_totals
    `);
        // Extract years, sort in descending order
        let years = rows.map((r) => r.financial_year);
        // Sort array in descending order 
        years.sort((a, b) => b.localeCompare(a));
        res.json(years);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getAvailableYears = getAvailableYears;
