"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
const initDB = async () => {
    try {
        // Connect without database selected first
        const connection = await promise_1.default.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'password',
        });
        const dbName = process.env.DB_NAME || 'finance_budget_db';
        console.log(`Creating database ${dbName} if not exists...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await connection.query(`USE \`${dbName}\``);
        console.log('Creating tables...');
        await connection.query(`
      CREATE TABLE IF NOT EXISTS budget_revenue_direct_expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        financial_year VARCHAR(20) NOT NULL,
        customer VARCHAR(255) NOT NULL,
        project VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        month VARCHAR(10) NOT NULL,
        revenue DECIMAL(15,2) DEFAULT 0,
        direct_expense_pct DECIMAL(5,2) DEFAULT 0,
        UNIQUE KEY unique_budget_rev (financial_year, customer, project, location, month)
      )
    `);
        await connection.query(`
      CREATE TABLE IF NOT EXISTS budget_corporate_expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        financial_year VARCHAR(20) NOT NULL,
        head VARCHAR(255) NOT NULL,
        month VARCHAR(10) NOT NULL,
        amount DECIMAL(15,2) DEFAULT 0,
        UNIQUE KEY unique_budget_corp (financial_year, head, month)
      )
    `);
        await connection.query(`
      CREATE TABLE IF NOT EXISTS budget_salaries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        financial_year VARCHAR(20) NOT NULL,
        head VARCHAR(255) NOT NULL,
        customer VARCHAR(255) DEFAULT '',
        project VARCHAR(255) DEFAULT '',
        location VARCHAR(255) DEFAULT '',
        designation VARCHAR(255) DEFAULT '',
        name_of_employee VARCHAR(255) DEFAULT '',
        month VARCHAR(10) NOT NULL,
        amount DECIMAL(15,2) DEFAULT 0,
        UNIQUE KEY unique_budget_salary (financial_year, head, customer, project, location, designation, name_of_employee, month)
      )
    `);
        await connection.query(`
      CREATE TABLE IF NOT EXISTS budget_bank_charges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        financial_year VARCHAR(20) NOT NULL,
        head VARCHAR(255) NOT NULL,
        month VARCHAR(10) NOT NULL,
        amount DECIMAL(15,2) DEFAULT 0,
        UNIQUE KEY unique_budget_bank (financial_year, head, month)
      )
    `);
        await connection.query(`
      CREATE TABLE IF NOT EXISTS summary_inputs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        financial_year VARCHAR(20) NOT NULL,
        month VARCHAR(10) NOT NULL,
        depreciation DECIMAL(15,2) DEFAULT 0,
        income_tax DECIMAL(15,2) DEFAULT 0,
        UNIQUE KEY unique_summary (financial_year, month)
      )
    `);
        await connection.query(`
      CREATE TABLE IF NOT EXISTS budget_totals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        financial_year VARCHAR(20) NOT NULL,
        module_name VARCHAR(50) NOT NULL,
        head_name VARCHAR(255) NOT NULL,
        total_amount DECIMAL(15,2) DEFAULT 0,
        UNIQUE KEY unique_budget_total (financial_year, module_name, head_name)
      )
    `);
        console.log('Database initialization complete.');
        await connection.end();
    }
    catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
};
initDB();
