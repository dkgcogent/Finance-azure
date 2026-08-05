import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'finance_budget_db',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS customer_invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_number VARCHAR(255) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        due_date DATE NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        format VARCHAR(100),
        financial_year VARCHAR(20),
        azure_blob_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table customer_invoices created successfully.');
  } catch (e) {
    console.error('Error creating table:', e);
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS vendor_cndn_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        note_number VARCHAR(255) NOT NULL,
        type ENUM('Credit Note', 'Debit Note') NOT NULL,
        vendor_invoice_ref VARCHAR(255) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        date DATE NOT NULL,
        reason VARCHAR(255) NOT NULL,
        remarks TEXT,
        azure_blob_url TEXT,
        status VARCHAR(50) DEFAULT 'Pending Ops Head',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table vendor_cndn_notes created successfully.');
  } catch (e) {
    console.error('Error creating table:', e);
  }

  process.exit(0);
}
run();
