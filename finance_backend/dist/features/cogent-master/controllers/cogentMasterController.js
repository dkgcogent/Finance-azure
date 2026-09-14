"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cogentMasterController = void 0;
const database_1 = require("../../../config/database");
// Helper to ensure table exists
async function ensureTable() {
    try {
        await database_1.db.query(`
      CREATE TABLE IF NOT EXISTS cogent_master_data (
        id INT PRIMARY KEY AUTO_INCREMENT,
        data_key VARCHAR(50) UNIQUE NOT NULL,
        data_value LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    }
    catch (error) {
        console.error('Error ensuring cogent_master_data table:', error);
    }
}
exports.cogentMasterController = {
    getMasterData: async (req, res) => {
        try {
            await ensureTable();
            const [rows] = await database_1.db.query('SELECT data_key, data_value FROM cogent_master_data WHERE data_key = "cogent_master"');
            if (rows && rows.length > 0) {
                const parsed = JSON.parse(rows[0].data_value);
                return res.json(parsed);
            }
            return res.json(null);
        }
        catch (error) {
            console.error('Error getting Cogent Master data:', error);
            res.status(500).json({ message: 'Failed to fetch Cogent Master data' });
        }
    },
    saveMasterData: async (req, res) => {
        try {
            await ensureTable();
            const dataStr = JSON.stringify(req.body);
            await database_1.db.query(`
        INSERT INTO cogent_master_data (data_key, data_value)
        VALUES ("cogent_master", ?)
        ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)
      `, [dataStr]);
            res.json({ success: true, message: 'Cogent Master data saved successfully' });
        }
        catch (error) {
            console.error('Error saving Cogent Master data:', error);
            res.status(500).json({ message: 'Failed to save Cogent Master data' });
        }
    }
};
