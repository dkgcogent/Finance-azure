import { db } from '../src/config/database';

async function setupImprests() {
  try {
    console.log("Setting up imprests database schema...");

    await db.query(`
      CREATE TABLE IF NOT EXISTS employee_imprests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        date DATE NOT NULL,
        head VARCHAR(255) NOT NULL,
        description TEXT,
        amount DECIMAL(10,2) DEFAULT 0.00,
        pass_amount DECIMAL(10,2) DEFAULT 0.00,
        cr_amount DECIMAL(10,2) DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'Pending for approval',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    console.log("Table 'employee_imprests' is ready.");
    process.exit(0);
  } catch (error) {
    console.error("Failed to setup employee_imprests table:", error);
    process.exit(1);
  }
}

setupImprests();
