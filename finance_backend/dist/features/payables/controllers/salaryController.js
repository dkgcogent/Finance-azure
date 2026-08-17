"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salaryController = void 0;
const database_1 = require("../../../config/database");
exports.salaryController = {
    getSalarySheet: async (req, res) => {
        try {
            const { month, year } = req.query;
            if (!month || !year) {
                return res.status(400).json({ message: 'Month and year are required' });
            }
            const query = `
        SELECT 
          e.employee_id AS EmployeeCode, 
          CONCAT(e.first_name, ' ', e.last_name) AS EmployeeName,
          e.account_holder_name AS AccountHolder, 
          e.account_number AS AccountNumber, 
          e.ifsc_code AS IFSCCode, 
          e.branch_name AS BranchName,
          p.gross_salary AS GrossAmount, 
          p.net_salary AS NetPayableAmount,
          p.payroll_data->>'$.status' AS PayrollStatus
        FROM hrms_payslips p
        JOIN hrms_employees e ON p.employee_id = e.id
        WHERE p.month = ? AND p.year = ?
      `;
            const [rows] = await database_1.db.query(query, [Number(month), Number(year)]);
            res.json(rows);
        }
        catch (error) {
            console.error('Error fetching salary sheet:', error);
            res.status(500).json({ message: 'Failed to fetch salary sheet data' });
        }
    }
};
