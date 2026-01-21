/**
 * Migration script to add documents column to purchase_orders table
 * Run this script if the documents column doesn't exist
 * 
 * Usage: node src/scripts/addDocumentsColumnToPO.js
 */

import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const addDocumentsColumn = async () => {
  try {
    console.log('🔍 Checking if documents column exists in purchase_orders table...');
    
    // Check if column exists
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'purchase_orders' 
      AND COLUMN_NAME = 'documents'
    `, { type: QueryTypes.SELECT });
    
    if (columns && columns.length > 0) {
      console.log('✅ documents column already exists in purchase_orders table');
      return;
    }
    
    console.log('📝 Adding documents column to purchase_orders table...');
    
    await sequelize.query(`
      ALTER TABLE \`purchase_orders\`
      ADD COLUMN \`documents\` JSON NULL COMMENT 'Array of document file paths'
    `, { type: QueryTypes.RAW });
    
    console.log('✅ documents column added successfully to purchase_orders table');
    
  } catch (error) {
    console.error('❌ Error adding documents column:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// Run the migration
addDocumentsColumn();
