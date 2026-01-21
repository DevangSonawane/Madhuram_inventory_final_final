import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * Migrate existing data from 'name' column to 'team_name' if needed
 */
const migrateTeamsData = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check if 'name' column exists
    const columns = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'teams'
      AND COLUMN_NAME = 'name'
    `, { type: QueryTypes.SELECT });

    if (columns && columns.length > 0) {
      console.log('🔧 Found "name" column. Migrating data to "team_name"...');
      
      // Copy data from name to team_name where team_name is empty
      const [result] = await sequelize.query(`
        UPDATE \`teams\`
        SET \`team_name\` = \`name\`
        WHERE (\`team_name\` IS NULL OR \`team_name\` = '') 
        AND \`name\` IS NOT NULL 
        AND \`name\` != ''
      `, { type: QueryTypes.UPDATE });
      
      console.log(`✅ Migrated data from 'name' to 'team_name'`);
    } else {
      console.log('✅ No "name" column found. Data migration not needed.');
    }

    console.log('\n✅ Data migration completed!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error migrating teams data:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    await sequelize.close();
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateTeamsData();
}

export default migrateTeamsData;

