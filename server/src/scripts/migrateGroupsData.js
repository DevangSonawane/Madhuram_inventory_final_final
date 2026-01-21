import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * Migrate existing data from 'name' column to 'group_name' if needed
 */
const migrateGroupsData = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check if 'name' column exists
    const columns = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'groups'
      AND COLUMN_NAME = 'name'
    `, { type: QueryTypes.SELECT });

    if (columns && columns.length > 0) {
      console.log('🔧 Found "name" column. Migrating data to "group_name"...');
      
      // Copy data from name to group_name where group_name is empty
      const [result] = await sequelize.query(`
        UPDATE \`groups\`
        SET \`group_name\` = \`name\`
        WHERE (\`group_name\` IS NULL OR \`group_name\` = '') 
        AND \`name\` IS NOT NULL 
        AND \`name\` != ''
      `, { type: QueryTypes.UPDATE });
      
      console.log(`✅ Migrated data from 'name' to 'group_name'`);
      
      // Optionally drop the old 'name' column (commented out for safety)
      // Uncomment if you want to remove the old column
      /*
      console.log('🔧 Dropping old "name" column...');
      await sequelize.query(`
        ALTER TABLE \`groups\`
        DROP COLUMN \`name\`
      `, { type: QueryTypes.RAW });
      console.log('✅ Dropped old "name" column');
      */
    } else {
      console.log('✅ No "name" column found. Data migration not needed.');
    }

    console.log('\n✅ Data migration completed!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error migrating groups data:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    await sequelize.close();
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateGroupsData();
}

export default migrateGroupsData;

