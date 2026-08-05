import { db } from './src/config/database';
async function run() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS budget_totals (
      financial_year VARCHAR(20),
      module_name VARCHAR(50),
      head_name VARCHAR(100),
      total_amount DECIMAL(15,2),
      PRIMARY KEY (financial_year, module_name, head_name)
    )`);
    console.log("budget_totals table created!");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
