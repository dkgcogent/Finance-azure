import { db } from '../src/config/database';
import bcrypt from 'bcryptjs';

async function setupAuth() {
  try {
    console.log("Setting up authentication database schema...");

    // 1. Add role column if it doesn't exist
    try {
      await db.query(`
        ALTER TABLE users 
        MODIFY COLUMN role VARCHAR(255) DEFAULT 'employee'
      `);
      console.log("Modified 'role' column to VARCHAR(255).");
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("'role' column already exists.");
      } else {
        throw e;
      }
    }

    // 2. Insert test users
    const passwordHash = await bcrypt.hash('password123', 10);
    
    // Admin user
    try {
      await db.query(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['admin', 'admin@finance.com', passwordHash, 'admin']
      );
      console.log("Created admin@finance.com (Role: admin)");
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') {
        console.log("admin@finance.com already exists. Updating role...");
        await db.query(
          'UPDATE users SET role = ? WHERE email = ?',
          ['admin', 'admin@finance.com']
        );
      } else {
        throw e;
      }
    }

    // Employee user
    try {
      await db.query(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['employee', 'employee@finance.com', passwordHash, 'employee']
      );
      console.log("Created employee@finance.com (Role: employee)");
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') {
        console.log("employee@finance.com already exists. Updating role...");
        await db.query(
          'UPDATE users SET role = ? WHERE email = ?',
          ['employee', 'employee@finance.com']
        );
      } else {
        throw e;
      }
    }

    console.log("Auth setup complete!");
    process.exit(0);
  } catch (error) {
    console.error("Failed to setup auth:", error);
    process.exit(1);
  }
}

setupAuth();
