import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function createTable() {
  const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS customer_cndn_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        note_number VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        customer_invoice_ref VARCHAR(255) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        reason VARCHAR(255),
        remarks TEXT,
        azure_blob_url TEXT,
        status VARCHAR(50) DEFAULT 'Pending Ops Head',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    console.log('Table customer_cndn_notes created successfully.');
  } catch (error) {
    console.error('Error creating table:', error);
  }
  process.exit(0);
}

createTable();
