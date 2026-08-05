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
      CREATE TABLE IF NOT EXISTS vendor_invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_number VARCHAR(255) NOT NULL,
        vendor_name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        due_date DATE NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        format VARCHAR(100),
        financial_year VARCHAR(20),
        azure_blob_url TEXT,
        linked_customer_invoice VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table vendor_invoices created successfully.');
  } catch (e) {
    console.error('Error creating table:', e);
  }

  process.exit(0);
}
run();
