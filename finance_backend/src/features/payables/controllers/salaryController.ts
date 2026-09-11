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
        `SELECT id, month_str, start_date, end_date, status, approved_date, 
                DATE_FORMAT(approved_date, '%Y-%m-%d') AS approved_date_formatted,
                total_employees, total_gross, total_net, sheet_data
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

      let approvedDateStr = sheet.approved_date_formatted || '';
      if (!approvedDateStr && sheet.approved_date) {
        if (sheet.approved_date instanceof Date) {
          const d = sheet.approved_date;
          const yr = d.getFullYear();
          const mo = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          approvedDateStr = `${yr}-${mo}-${day}`;
        } else if (typeof sheet.approved_date === 'string') {
          const str = sheet.approved_date.trim();
          if (str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 3) {
              const d = parts[0].padStart(2, '0');
              const m = parts[1].padStart(2, '0');
              const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
              approvedDateStr = `${y}-${m}-${d}`;
            }
          } else {
            approvedDateStr = str.split('T')[0].split(' ')[0];
          }
        } else {
          approvedDateStr = String(sheet.approved_date);
        }
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
        Department: row.department || 'Operations',
        ApprovedDate: approvedDateStr || sheet.approved_date || '',
        SheetMonth: sheet.month_str || ''
      }));

      res.json(mappedRows);
    } catch (error) {
      console.error('Error fetching salary sheet:', error);
      res.status(500).json({ message: 'Failed to fetch salary sheet data' });
    }
  },

  ensureSalaryBankPaymentSheetTable: async () => {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS SalaryBankPaymentSheet (
          id INT AUTO_INCREMENT PRIMARY KEY,
          batch_id VARCHAR(100) NOT NULL,
          excel_name VARCHAR(255) NOT NULL,
          month VARCHAR(50) NULL,
          date_from VARCHAR(50) NULL,
          date_to VARCHAR(50) NULL,
          transaction_type VARCHAR(50) DEFAULT 'IFC',
          debit_account_no VARCHAR(50) DEFAULT '163905500140',
          ifsc_code VARCHAR(50) DEFAULT 'ICIC0000011',
          beneficiary_account_no VARCHAR(100) NULL,
          beneficiary_name VARCHAR(255) NULL,
          amount DECIMAL(15,2) DEFAULT 0.00,
          remarks_client VARCHAR(255) DEFAULT 'SALARY',
          remarks_beneficiary VARCHAR(255) NULL,
          output_text TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_batch_id (batch_id),
          INDEX idx_excel_name (excel_name),
          INDEX idx_created_at (created_at)
        )
      `);
    } catch (e) {
      console.error('Error ensuring SalaryBankPaymentSheet table:', e);
    }
  },

  saveBankPaymentSheet: async (req: Request, res: Response) => {
    try {
      await salaryController.ensureSalaryBankPaymentSheetTable();

      const { excelName, month, dateFrom, dateTo, rows } = req.body;

      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: 'No rows provided to save' });
      }

      const batchId = `BATCH_SALARY_${Date.now()}`;
      const defaultExcelName = excelName || `Salary_Payment_Bank_Format_${batchId}.xlsx`;

      const insertValues = rows.map((r: any) => {
        const txnType = r.transactionType || 'IFC';
        const debitAcc = r.debitAccountNo || '163905500140';
        const ifsc = r.ifscCode || 'ICIC0000011';
        const accNo = r.beneficiaryAccountNo || '';
        const bName = r.beneficiaryName || '';
        const amt = Number(r.amount) || 0;
        const remClient = (r.remarksClient || 'SALARY').substring(0, 21);
        const remBeneficiary = (r.remarksBeneficiary || `Salary of ${bName}`).substring(0, 30);
        
        // Output computation
        const isWib = txnType.toUpperCase() === 'WIB';
        const prefix = isWib ? 'APW' : 'APO';
        const outputText = r.outputText || `${prefix}|${txnType}|${Math.round(amt * 100) / 100}|INR|${debitAcc}|0011|${ifsc}|${accNo}|0011|${bName}|${remClient}|${remBeneficiary}^`;

        return [
          batchId,
          defaultExcelName,
          month || '',
          dateFrom || '',
          dateTo || '',
          txnType,
          debitAcc,
          ifsc,
          accNo,
          bName,
          amt,
          remClient,
          remBeneficiary,
          outputText
        ];
      });

      const sql = `
        INSERT INTO SalaryBankPaymentSheet (
          batch_id,
          excel_name,
          month,
          date_from,
          date_to,
          transaction_type,
          debit_account_no,
          ifsc_code,
          beneficiary_account_no,
          beneficiary_name,
          amount,
          remarks_client,
          remarks_beneficiary,
          output_text
        ) VALUES ?
      `;

      await db.query(sql, [insertValues]);

      res.status(201).json({
        success: true,
        message: 'Salary bank payment sheet saved successfully',
        batchId,
        excelName: defaultExcelName,
        totalEntries: rows.length
      });
    } catch (error: any) {
      console.error('Error saving salary bank payment sheet:', error);
      res.status(500).json({ message: 'Failed to save salary bank payment sheet', error: error.message });
    }
  },

  getBankPaymentSheets: async (req: Request, res: Response) => {
    try {
      await salaryController.ensureSalaryBankPaymentSheetTable();

      const [rows]: any = await db.query(`
        SELECT 
          batch_id as batchId,
          excel_name as excelName,
          month,
          date_from as dateFrom,
          date_to as dateTo,
          COUNT(*) as totalEntries,
          SUM(amount) as totalAmount,
          MIN(created_at) as createdAt,
          MAX(updated_at) as updatedAt
        FROM SalaryBankPaymentSheet
        GROUP BY batch_id, excel_name, month, date_from, date_to
        ORDER BY MIN(created_at) DESC
      `);

      res.json(rows);
    } catch (error: any) {
      console.error('Error fetching salary bank payment sheets:', error);
      res.status(500).json({ message: 'Failed to fetch salary bank payment sheets', error: error.message });
    }
  },

  getBankPaymentSheetBatch: async (req: Request, res: Response) => {
    try {
      await salaryController.ensureSalaryBankPaymentSheetTable();

      const { batchId } = req.params;
      const [rows]: any = await db.query(
        `SELECT * FROM SalaryBankPaymentSheet WHERE batch_id = ? ORDER BY id ASC`,
        [batchId]
      );

      res.json(rows);
    } catch (error: any) {
      console.error('Error fetching batch rows:', error);
      res.status(500).json({ message: 'Failed to fetch batch rows', error: error.message });
    }
  }
};
