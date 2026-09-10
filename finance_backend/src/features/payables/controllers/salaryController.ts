import { Request, Response } from 'express';
import { db } from '../../../config/database';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const salaryController = {
  getPendingApprovals: async (req: Request, res: Response) => {
    try {
      const [rows]: any = await db.query(
        `SELECT id, month_str, start_date, end_date, status, sent_date, 
                approved_date, total_employees, total_gross, total_net, sheet_data, notes, created_at
         FROM hrms_payment_sheets 
         WHERE status = 'PENDING_APPROVAL'
         ORDER BY sent_date DESC, id DESC`
      );

      const parsedRows = rows.map((row: any) => {
        let sheetData = [];
        if (typeof row.sheet_data === 'string') {
          try {
            sheetData = JSON.parse(row.sheet_data);
          } catch (e) {
            sheetData = [];
          }
        } else if (Array.isArray(row.sheet_data)) {
          sheetData = row.sheet_data;
        }

        return {
          ...row,
          sheet_data: sheetData
        };
      });

      res.json(parsedRows);
    } catch (error) {
      console.error('Error fetching pending salary approvals:', error);
      res.status(500).json({ message: 'Failed to fetch pending salary approvals' });
    }
  },

  updateSheetStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ message: 'Valid status (APPROVED or REJECTED) is required' });
      }

      const [existing]: any = await db.query('SELECT * FROM hrms_payment_sheets WHERE id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ message: 'Payment sheet not found' });
      }

      const todayStr = new Date().toISOString().split('T')[0];

      if (status === 'APPROVED') {
        await db.query(
          `UPDATE hrms_payment_sheets 
           SET status = 'APPROVED', approved_date = ?, notes = COALESCE(?, notes) 
           WHERE id = ?`,
          [todayStr, notes || null, id]
        );
      } else {
        await db.query(
          `UPDATE hrms_payment_sheets 
           SET status = 'REJECTED', notes = COALESCE(?, notes) 
           WHERE id = ?`,
          [notes || 'Rejected in Final Approvals', id]
        );
      }

      res.json({ 
        success: true, 
        message: `Payment sheet ${status.toLowerCase()} successfully`,
        status,
        approvedDate: status === 'APPROVED' ? todayStr : null
      });
    } catch (error) {
      console.error('Error updating payment sheet status:', error);
      res.status(500).json({ message: 'Failed to update payment sheet status' });
    }
  },

  getSalarySheet: async (req: Request, res: Response) => {
    try {
      const { month, year } = req.query;

      if (!month || !year) {
        return res.status(400).json({ message: 'Month and year are required' });
      }

      const numMonth = Number(month);
      const numYear = Number(year);
      const monthAbbr = MONTH_NAMES[numMonth - 1] || '';
      const yearShort = String(numYear).slice(-2);
      const monthStrPattern = `%${monthAbbr}%${yearShort}%`;

      // Check if an APPROVED payment sheet exists for this month & year
      const [approvedSheets]: any = await db.query(
        `SELECT id, month_str, start_date, end_date, status, approved_date, total_employees, total_gross, total_net, sheet_data
         FROM hrms_payment_sheets 
         WHERE status = 'APPROVED' 
           AND (
             month_str LIKE ? 
             OR (MONTH(start_date) = ? AND YEAR(start_date) = ?)
             OR (MONTH(end_date) = ? AND YEAR(end_date) = ?)
           )
         ORDER BY id DESC LIMIT 1`,
        [monthStrPattern, numMonth, numYear, numMonth, numYear]
      );

      if (approvedSheets.length === 0) {
        // No approved sheet exists yet. Return empty list with approval status metadata
        return res.json([]);
      }

      const sheet = approvedSheets[0];
      let sheetData: any[] = [];
      if (typeof sheet.sheet_data === 'string') {
        try {
          sheetData = JSON.parse(sheet.sheet_data);
        } catch (e) {
          sheetData = [];
        }
      } else if (Array.isArray(sheet.sheet_data)) {
        sheetData = sheet.sheet_data;
      }

      const mappedRows = sheetData.map((row: any, index: number) => ({
        id: String(row.sNo || index + 1),
        EmployeeCode: row.employeeCode || row.employee_code || (row.employeeId ? `EMP${row.employeeId}` : 'N/A'),
        EmployeeName: row.employeeName || row.employee_name || 'Unknown',
        AccountHolder: row.accountHolder || row.accountHolderName || row.employeeName || 'N/A',
        AccountNumber: row.accountNumber || row.account_number || 'N/A',
        IFSCCode: row.ifscCode || row.ifsc_code || 'SBIN0001234',
        BranchName: row.bankName || row.branch_name || 'N/A',
        GrossAmount: Number(row.grossSalary || row.gross_salary || 0),
        NetPayableAmount: Number(row.netSalary || row.net_salary || 0),
        PayrollStatus: 'Approved',
        PaymentMode: row.paymentMode || 'Bank Transfer',
        Department: row.department || 'Operations'
      }));

      res.json(mappedRows);
    } catch (error) {
      console.error('Error fetching salary sheet:', error);
      res.status(500).json({ message: 'Failed to fetch salary sheet data' });
    }
  }
};
