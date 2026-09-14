"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imprestController = void 0;
const database_1 = require("../../../config/database");
exports.imprestController = {
    createImprest: async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized: User ID not found' });
            }
            const { date, head, description, amount, passAmount, crAmount } = req.body;
            if (!date || !head) {
                return res.status(400).json({ message: 'Date and Head are required' });
            }
            const query = `
        INSERT INTO employee_imprests 
        (user_id, date, head, description, amount, pass_amount, cr_amount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
      `;
            const [result] = await database_1.db.query(query, [
                userId,
                date,
                head,
                description || '',
                amount || 0,
                passAmount || 0,
                crAmount || 0
            ]);
            res.status(201).json({
                message: 'Imprest request submitted successfully',
                id: result.insertId,
                status: 'Pending for approval'
            });
        }
        catch (error) {
            console.error('Error creating imprest:', error);
            res.status(500).json({ message: 'Failed to create imprest request', error: error.message });
        }
    },
    getImprests: async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            const role = req.user.role;
            const status = req.query.status;
            let query = 'SELECT * FROM employee_imprests';
            let params = [];
            let conditions = [];
            if (role === 'employee') {
                conditions.push('user_id = ?');
                params.push(userId);
            }
            if (status) {
                conditions.push('status = ?');
                params.push(status);
            }
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            query += ' ORDER BY created_at DESC';
            const [rows] = await database_1.db.query(query, params);
            res.json(rows);
        }
        catch (error) {
            console.error('Error fetching imprests:', error);
            res.status(500).json({ message: 'Failed to fetch imprests', error: error.message });
        }
    },
    updateImprestStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status, passAmount } = req.body;
            if (!id || !status) {
                return res.status(400).json({ message: 'ID and Status are required' });
            }
            const query = `
        UPDATE employee_imprests
        SET status = ?, pass_amount = ?
        WHERE id = ?
      `;
            await database_1.db.query(query, [status, passAmount || 0, id]);
            res.json({ message: 'Imprest status updated successfully', id, status, passAmount });
        }
        catch (error) {
            console.error('Error updating imprest status:', error);
            res.status(500).json({ message: 'Failed to update imprest status', error: error.message });
        }
    },
    getTmsData: async (req, res) => {
        try {
            const userId = req.user?.id;
            const type = req.query.type; // 'advance' or 'balance'
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            // First get the username for the current user
            const [userRows] = await database_1.db.query('SELECT username FROM users WHERE id = ?', [userId]);
            if (userRows.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            const username = userRows[0].username;
            let query = '';
            let params = [];
            // Note: We use TransactionDate for "today's date". 
            if (type === 'advance') {
                query = `
          SELECT SUM(AdvanceToPaid) as total 
          FROM tmsdatabase.adhoc_transactions 
          WHERE AdvancePaidBy = ? AND DATE(TransactionDate) = CURDATE()
        `;
                params = [username];
            }
            else if (type === 'balance') {
                query = `
          SELECT SUM(BalanceToBePaid) as total 
          FROM tmsdatabase.adhoc_transactions 
          WHERE BalancePaidBy = ? AND DATE(TransactionDate) = CURDATE()
        `;
                params = [username];
            }
            else {
                return res.status(400).json({ message: 'Invalid type. Use "advance" or "balance"' });
            }
            const [rows] = await database_1.db.query(query, params);
            const total = rows[0]?.total || 0;
            res.json({ total: Number(total) });
        }
        catch (error) {
            console.error('Error fetching TMS data:', error);
            res.status(500).json({ message: 'Failed to fetch TMS data', error: error.message });
        }
    },
    ensureBankPaymentSheetTable: async () => {
        try {
            await database_1.db.query(`
        CREATE TABLE IF NOT EXISTS ImprestBankPaymentSheet (
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
          remarks_client VARCHAR(255) DEFAULT 'IMPREST',
          remarks_beneficiary VARCHAR(255) NULL,
          output_text TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_batch_id (batch_id),
          INDEX idx_excel_name (excel_name),
          INDEX idx_created_at (created_at)
        )
      `);
        }
        catch (e) {
            console.error('Error ensuring ImprestBankPaymentSheet table:', e);
        }
    },
    saveBankPaymentSheet: async (req, res) => {
        try {
            await exports.imprestController.ensureBankPaymentSheetTable();
            const { excelName, month, dateFrom, dateTo, rows } = req.body;
            if (!rows || !Array.isArray(rows) || rows.length === 0) {
                return res.status(400).json({ message: 'No rows provided to save' });
            }
            const batchId = `BATCH_${Date.now()}`;
            const defaultExcelName = excelName || `Imprest_Payment_Bank_Format_${batchId}.xlsx`;
            const insertValues = rows.map((r) => {
                const txnType = r.transactionType || 'IFC';
                const debitAcc = r.debitAccountNo || '163905500140';
                const ifsc = r.ifscCode || 'ICIC0000011';
                const accNo = r.beneficiaryAccountNo || '';
                const bName = r.beneficiaryName || '';
                const amt = Number(r.amount) || 0;
                const remClient = (r.remarksClient || 'IMPREST').substring(0, 21);
                const remBeneficiary = (r.remarksBeneficiary || 'Imprest Payment').substring(0, 30);
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
        INSERT INTO ImprestBankPaymentSheet (
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
            await database_1.db.query(sql, [insertValues]);
            res.status(201).json({
                success: true,
                message: 'Bank payment sheet saved successfully',
                batchId,
                excelName: defaultExcelName,
                totalEntries: rows.length
            });
        }
        catch (error) {
            console.error('Error saving bank payment sheet:', error);
            res.status(500).json({ message: 'Failed to save bank payment sheet', error: error.message });
        }
    },
    getBankPaymentSheets: async (req, res) => {
        try {
            await exports.imprestController.ensureBankPaymentSheetTable();
            const [rows] = await database_1.db.query(`
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
        FROM ImprestBankPaymentSheet
        GROUP BY batch_id, excel_name, month, date_from, date_to
        ORDER BY MIN(created_at) DESC
      `);
            res.json(rows);
        }
        catch (error) {
            console.error('Error fetching bank payment sheets:', error);
            res.status(500).json({ message: 'Failed to fetch bank payment sheets', error: error.message });
        }
    },
    getBankPaymentSheetBatch: async (req, res) => {
        try {
            await exports.imprestController.ensureBankPaymentSheetTable();
            const { batchId } = req.params;
            const [rows] = await database_1.db.query(`SELECT * FROM ImprestBankPaymentSheet WHERE batch_id = ? ORDER BY id ASC`, [batchId]);
            res.json(rows);
        }
        catch (error) {
            console.error('Error fetching batch rows:', error);
            res.status(500).json({ message: 'Failed to fetch batch rows', error: error.message });
        }
    }
};
