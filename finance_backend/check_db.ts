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

  const [tables] = await db.query('SHOW TABLES;');
  console.log('Tables:', tables);

  try {
    const [cols] = await db.query('DESCRIBE customer_invoices;');
    console.log('customer_invoices cols:', cols);
  } catch (e) {
    console.log('customer_invoices table does not exist');
  }

  process.exit(0);
}
run();
