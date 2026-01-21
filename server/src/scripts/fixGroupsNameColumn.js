import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * Fix groups table - remove legacy 'name' column that causes "Field 'name' doesn't have a default value" error
 * Run this script to fix the groups table structure
 */
const fixGroupsNameColumn = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check if groups table exists
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'groups'
    `, { type: QueryTypes.SELECT });

    if (!tables || tables.length === 0) {
      console.log('❌ groups table does not exist. Nothing to fix.');
      await sequelize.close();
      process.exit(0);
      return;
    }

    // Get all existing columns
    const allColumns = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'groups'
      ORDER BY ORDINAL_POSITION
    `, { type: QueryTypes.SELECT });

    const existingColumnNames = Array.isArray(allColumns) && allColumns.length > 0
      ? allColumns.map(col => col.COLUMN_NAME || col[0] || col)
      : [];
    
    console.log('Current columns:', existingColumnNames.join(', '));

    // Check if 'name' column exists
    if (existingColumnNames.includes('name')) {
      console.log('🔧 Found legacy "name" column. Migrating data and removing it...');
      
      // First, ensure group_name column exists
      if (!existingColumnNames.includes('group_name')) {
        console.log('⚠️  group_name column does not exist. Creating it...');
        await sequelize.query(`
          ALTER TABLE \`groups\`
          ADD COLUMN \`group_name\` VARCHAR(255) NOT NULL DEFAULT '' AFTER \`group_id\`
        `, { type: QueryTypes.RAW });
        
        // Migrate data from 'name' to 'group_name'
        await sequelize.query(`
          UPDATE \`groups\`
          SET \`group_name\` = \`name\`
          WHERE (\`group_name\` IS NULL OR \`group_name\` = '') 
          AND \`name\` IS NOT NULL 
          AND \`name\` != ''
        `, { type: QueryTypes.UPDATE });
        
        // Remove default and make it NOT NULL
        await sequelize.query(`
          ALTER TABLE \`groups\`
          MODIFY COLUMN \`group_name\` VARCHAR(255) NOT NULL
        `, { type: QueryTypes.RAW });
        console.log('✅ Created and populated group_name column');
      } else {
        // Migrate any remaining data from 'name' to 'group_name'
        await sequelize.query(`
          UPDATE \`groups\`
          SET \`group_name\` = \`name\`
          WHERE (\`group_name\` IS NULL OR \`group_name\` = '') 
          AND \`name\` IS NOT NULL 
          AND \`name\` != ''
        `, { type: QueryTypes.UPDATE });
        console.log('✅ Migrated data from "name" to "group_name"');
      }
      
      // Now drop the legacy 'name' column
      try {
        await sequelize.query(`
          ALTER TABLE \`groups\`
          DROP COLUMN \`name\`
        `, { type: QueryTypes.RAW });
        console.log('✅ Dropped legacy "name" column');
      } catch (dropError) {
        console.error('❌ Could not drop "name" column:', dropError.message);
        console.log('⚠️  You may need to manually drop the column or check for dependencies');
        throw dropError;
      }
    } else {
      console.log('✅ No legacy "name" column found. Table structure is correct.');
    }

    // Verify final structure
    const finalColumns = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'groups'
      ORDER BY ORDINAL_POSITION
    `, { type: QueryTypes.SELECT });

    const finalColumnNames = Array.isArray(finalColumns) && finalColumns.length > 0
      ? finalColumns.map(col => col.COLUMN_NAME || col[0] || col)
      : [];
    
    console.log('\n✅ Final table structure:');
    console.log('Columns:', finalColumnNames.join(', '));
    console.log('\n✅ groups table fixed successfully!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing groups table:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    await sequelize.close();
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixGroupsNameColumn();
}

export default fixGroupsNameColumn;

