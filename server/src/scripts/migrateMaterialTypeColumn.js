import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * Migration script to change material_type column from ENUM to VARCHAR(100)
 * This allows dynamic material types from the material_types table
 * 
 * Run with: node src/scripts/migrateMaterialTypeColumn.js
 */

const migrateMaterialTypeColumn = async () => {
  try {
    console.log('🚀 Starting material_type column migration...\n');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected successfully\n');

    // Check if column exists and get its type
    const columnInfo = await sequelize.query(`
      SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'purchase_request_items'
        AND COLUMN_NAME = 'material_type'
    `, { type: QueryTypes.SELECT });

    if (!Array.isArray(columnInfo) || columnInfo.length === 0) {
      console.log('⚠️  Column material_type does not exist in purchase_request_items table');
      console.log('   This migration only applies to existing columns.');
      await sequelize.close();
      process.exit(0);
    }

    const currentType = columnInfo[0].COLUMN_TYPE || '';
    const isNullable = columnInfo[0].IS_NULLABLE === 'YES';
    
    console.log(`📊 Current column type: ${currentType}`);
    console.log(`   Nullable: ${isNullable}\n`);

    // Check if it's already VARCHAR
    if (currentType.toUpperCase().includes('VARCHAR')) {
      console.log('✅ Column is already VARCHAR type. No migration needed.\n');
      await sequelize.close();
      process.exit(0);
    }

    // Check if it's an ENUM type
    if (!currentType.toUpperCase().startsWith('ENUM')) {
      console.log(`⚠️  Column type is ${currentType}, not ENUM.`);
      console.log('   This migration is designed for ENUM -> VARCHAR conversion.');
      console.log('   If you need to change this column, please do it manually.\n');
      await sequelize.close();
      process.exit(0);
    }

    console.log('🔄 Migrating material_type from ENUM to VARCHAR(100)...\n');

    // Perform the migration
    await sequelize.query(`
      ALTER TABLE \`purchase_request_items\`
      MODIFY COLUMN \`material_type\` VARCHAR(100) NOT NULL 
      COMMENT 'Type of material (references material_types table)'
    `, { type: QueryTypes.RAW });

    console.log('✅ Migration completed successfully!\n');
    console.log('📝 Summary:');
    console.log('   ✅ Changed material_type from ENUM to VARCHAR(100)');
    console.log('   ✅ Column now supports dynamic material types from material_types table');
    console.log('   ✅ Existing data is preserved\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    
    await sequelize.close();
    process.exit(1);
  }
};

// Run migration
migrateMaterialTypeColumn();

