import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * Fix teams table - change group_id from INTEGER to CHAR(36) to match UUID format
 * Run this script to fix the teams table structure
 */
const fixTeamsGroupIdColumn = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check if teams table exists
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'teams'
    `, { type: QueryTypes.SELECT });

    if (!tables || tables.length === 0) {
      console.log('❌ teams table does not exist. Nothing to fix.');
      await sequelize.close();
      process.exit(0);
      return;
    }

    // Get group_id column information
    const [columnInfo] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'teams'
      AND COLUMN_NAME = 'group_id'
    `, { type: QueryTypes.SELECT });

    if (!columnInfo || columnInfo.length === 0) {
      console.log('⚠️  group_id column does not exist. Creating it...');
      await sequelize.query(`
        ALTER TABLE \`teams\`
        ADD COLUMN \`group_id\` CHAR(36) NULL AFTER \`team_name\`
      `, { type: QueryTypes.RAW });
      console.log('✅ Created group_id column as CHAR(36)');
    } else {
      const info = Array.isArray(columnInfo) ? columnInfo[0] : columnInfo;
      const dataType = info.DATA_TYPE || info[1];
      const columnType = info.COLUMN_TYPE || info[2];
      
      console.log(`Current group_id type: ${dataType} (${columnType})`);
      
      // Check if it's INTEGER and needs to be changed
      if (dataType === 'int' || dataType === 'integer' || (columnType && columnType.includes('int'))) {
        console.log('🔧 group_id is INTEGER, changing to CHAR(36)...');
        
        // Drop foreign key if it exists
        try {
          const [fks] = await sequelize.query(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'teams'
            AND COLUMN_NAME = 'group_id'
            AND REFERENCED_TABLE_NAME = 'groups'
          `, { type: QueryTypes.SELECT });
          
          if (fks && fks.length > 0) {
            const fkInfo = Array.isArray(fks[0]) ? fks[0] : fks[0];
            const fkName = fkInfo.CONSTRAINT_NAME || fkInfo[0] || 'fk_team_group';
            console.log(`   Dropping foreign key: ${fkName}`);
            await sequelize.query(`
              ALTER TABLE \`teams\`
              DROP FOREIGN KEY \`${fkName}\`
            `, { type: QueryTypes.RAW });
            console.log('✅ Dropped foreign key');
          }
        } catch (fkError) {
          console.log('⚠️  Could not drop foreign key (may not exist):', fkError.message);
        }
        
        // Clear any existing integer values (they won't be valid UUIDs)
        // Set to NULL since we can't convert integers to UUIDs
        try {
          await sequelize.query(`
            UPDATE \`teams\`
            SET \`group_id\` = NULL
            WHERE \`group_id\` IS NOT NULL
          `, { type: QueryTypes.UPDATE });
          console.log('✅ Cleared existing integer group_id values');
        } catch (clearError) {
          console.log('⚠️  Could not clear existing values:', clearError.message);
        }
        
        // Change column type from INTEGER to CHAR(36)
        await sequelize.query(`
          ALTER TABLE \`teams\`
          MODIFY COLUMN \`group_id\` CHAR(36) NULL
        `, { type: QueryTypes.RAW });
        console.log('✅ Changed group_id from INTEGER to CHAR(36)');
        
        // Re-add foreign key
        try {
          await sequelize.query(`
            ALTER TABLE \`teams\`
            ADD CONSTRAINT \`fk_team_group\` FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`group_id\`) ON DELETE SET NULL
          `, { type: QueryTypes.RAW });
          console.log('✅ Re-added foreign key constraint');
        } catch (fkError) {
          console.log('⚠️  Could not re-add foreign key:', fkError.message);
          console.log('   You may need to manually add the foreign key constraint');
        }
      } else if (dataType === 'char' || dataType === 'varchar') {
        console.log('✅ group_id is already CHAR/VARCHAR. No changes needed.');
      } else {
        console.log(`⚠️  group_id has unexpected type: ${dataType}. Consider manual review.`);
      }
    }

    // Verify final structure
    const [finalInfo] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'teams'
      AND COLUMN_NAME = 'group_id'
    `, { type: QueryTypes.SELECT });

    if (finalInfo && finalInfo.length > 0) {
      const info = Array.isArray(finalInfo) ? finalInfo[0] : finalInfo;
      console.log('\n✅ Final group_id column structure:');
      console.log(`   Type: ${info.DATA_TYPE || info[1]} (${info.COLUMN_TYPE || info[2]})`);
    }

    console.log('\n✅ teams table fixed successfully!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing teams table:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    await sequelize.close();
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixTeamsGroupIdColumn();
}

export default fixTeamsGroupIdColumn;

