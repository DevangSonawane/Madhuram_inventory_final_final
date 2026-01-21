import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * Fix groups table - add missing group_name column if it doesn't exist
 * Run this if you get "Key column 'group_name' doesn't exist in table" error
 */
const fixGroupsTable = async () => {
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
      console.log('ℹ️  groups table does not exist. Run migrations first.');
      await sequelize.close();
      return;
    }

    // Check if group_name column exists
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'groups' 
        AND COLUMN_NAME = 'group_name'
    `, { type: QueryTypes.SELECT });

    if (!columns || columns.length === 0) {
      console.log('🔧 Adding group_name column to groups table...');
      
      // Check what columns exist to determine where to add
      const [allColumns] = await sequelize.query(`
        SELECT COLUMN_NAME, ORDINAL_POSITION
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'groups'
        ORDER BY ORDINAL_POSITION
      `, { type: QueryTypes.SELECT });

      console.log('Current columns:', allColumns.map(c => c.COLUMN_NAME).join(', '));

      // Add group_name column after group_id
      await sequelize.query(`
        ALTER TABLE \`groups\`
        ADD COLUMN \`group_name\` VARCHAR(255) NOT NULL DEFAULT '' AFTER \`group_id\`
      `, { type: QueryTypes.RAW });

      console.log('✅ group_name column added');

      // Update default value to remove it (make it truly required)
      await sequelize.query(`
        ALTER TABLE \`groups\`
        MODIFY COLUMN \`group_name\` VARCHAR(255) NOT NULL
      `, { type: QueryTypes.RAW });

      console.log('✅ group_name column configured');
    } else {
      console.log('✅ group_name column already exists');
    }

    // Check and add index
    const [indexes] = await sequelize.query(`
      SELECT INDEX_NAME 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'groups' 
        AND INDEX_NAME = 'idx_group_name'
    `, { type: QueryTypes.SELECT });

    if (!indexes || indexes.length === 0) {
      console.log('🔧 Adding index on group_name...');
      await sequelize.query(`
        ALTER TABLE \`groups\`
        ADD INDEX \`idx_group_name\` (\`group_name\`)
      `, { type: QueryTypes.RAW });
      console.log('✅ Index added on group_name');
    } else {
      console.log('✅ Index on group_name already exists');
    }

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
  fixGroupsTable();
}

export default fixGroupsTable;

