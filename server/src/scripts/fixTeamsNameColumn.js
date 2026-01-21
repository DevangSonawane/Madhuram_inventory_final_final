import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * Fix teams table - remove legacy 'name' column that causes "Field 'name' doesn't have a default value" error
 * This script migrates data from 'name' to 'team_name' and then drops the 'name' column
 */

const fixTeamsNameColumn = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Get all columns in teams table
    const allColumns = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'teams'
    `, { type: QueryTypes.SELECT });

    const existingColumnNames = Array.isArray(allColumns) && allColumns.length > 0
      ? allColumns.map(col => col.COLUMN_NAME || (Array.isArray(col) ? col[0] : null)).filter(Boolean)
      : [];

    // Check if 'name' column exists
    if (existingColumnNames.includes('name')) {
      console.log('🔧 Found legacy "name" column. Migrating data and removing it...');

      // First, ensure team_name column exists
      if (!existingColumnNames.includes('team_name')) {
        console.log('⚠️  team_name column does not exist. Creating it...');
        await sequelize.query(`
          ALTER TABLE \`teams\`
          ADD COLUMN \`team_name\` VARCHAR(255) NULL AFTER \`team_id\`
        `, { type: QueryTypes.RAW });
        console.log('✅ Created team_name column');
      }

      // Migrate data from 'name' to 'team_name' if team_name is empty
      await sequelize.query(`
        UPDATE \`teams\`
        SET \`team_name\` = \`name\`
        WHERE (\`team_name\` IS NULL OR \`team_name\` = '') 
        AND \`name\` IS NOT NULL 
        AND \`name\` != ''
      `, { type: QueryTypes.RAW });
      console.log('✅ Migrated data from "name" to "team_name"');

      // Make team_name NOT NULL if it has data
      try {
        await sequelize.query(`
          ALTER TABLE \`teams\`
          MODIFY COLUMN \`team_name\` VARCHAR(255) NOT NULL
        `, { type: QueryTypes.RAW });
        console.log('✅ Set team_name as NOT NULL');
      } catch (modifyError) {
        console.log('⚠️  Could not set team_name as NOT NULL (may have NULL values):', modifyError.message);
      }

      // Now drop the legacy 'name' column
      try {
        await sequelize.query(`
          ALTER TABLE \`teams\`
          DROP COLUMN \`name\`
        `, { type: QueryTypes.RAW });
        console.log('✅ Dropped legacy "name" column');
      } catch (dropError) {
        console.error('❌ Could not drop "name" column:', dropError.message);
        // If we can't drop it, at least make it nullable
        try {
          await sequelize.query(`
            ALTER TABLE \`teams\`
            MODIFY COLUMN \`name\` VARCHAR(255) NULL
          `, { type: QueryTypes.RAW });
          console.log('✅ Made "name" column nullable as fallback');
        } catch (nullableError) {
          console.error('❌ Could not make "name" column nullable:', nullableError.message);
        }
      }
    } else {
      console.log('✅ No legacy "name" column found. Table structure is correct.');
    }

    // Verify final structure
    const finalColumns = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'teams'
      ORDER BY ORDINAL_POSITION
    `, { type: QueryTypes.SELECT });

    const finalColumnNames = Array.isArray(finalColumns) && finalColumns.length > 0
      ? finalColumns.map(col => col.COLUMN_NAME || (Array.isArray(col) ? col[0] : null)).filter(Boolean)
      : [];

    console.log('\n📋 Final teams table columns:', finalColumnNames.join(', '));
    console.log('\n✅ Migration completed successfully!');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.stack) console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('fixTeamsNameColumn')) {
  fixTeamsNameColumn();
}

export default fixTeamsNameColumn;

