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
    }
};
