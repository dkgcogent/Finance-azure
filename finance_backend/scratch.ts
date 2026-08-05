import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'finance_budget_db',
    ...(process.env.DB_SSL === 'true' && {
      ssl: {
        rejectUnauthorized: false
      }
    })
  });

  try {
    const [rows] = await db.query(`SELECT * FROM users LIMIT 5`);
    console.log(rows);
  } catch (e: any) {
    console.log('Error:', e.message);
  }

  process.exit(0);
}
run();
