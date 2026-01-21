import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * Complete fix for groups table - ensures all required columns exist
 * Run this if you get "Unknown column 'group_id' in 'field list'" error
 */
const fixGroupsTableComplete = async () => {
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
      console.log('🔧 groups table does not exist. Creating it...');
      await sequelize.query(`
        CREATE TABLE \`groups\` (
          \`group_id\` CHAR(36) NOT NULL PRIMARY KEY,
          \`group_name\` VARCHAR(255) NOT NULL,
          \`description\` TEXT NULL,
          \`org_id\` CHAR(36) NULL,
          \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_group_name\` (\`group_name\`),
          INDEX \`idx_org_id\` (\`org_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `, { type: QueryTypes.RAW });
      console.log('✅ groups table created');
      await sequelize.close();
      process.exit(0);
      return;
    }

    console.log('🔧 Fixing groups table structure...');

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

    // Check and add group_id if missing (this is the primary key)
    if (!existingColumnNames.includes('group_id')) {
      console.log('🔧 Adding group_id column...');
      
      // Check if there's an 'id' column we should rename
      if (existingColumnNames.includes('id')) {
        // Rename id to group_id
        await sequelize.query(`
          ALTER TABLE \`groups\`
          CHANGE COLUMN \`id\` \`group_id\` CHAR(36) NOT NULL
        `, { type: QueryTypes.RAW });
        console.log('✅ Renamed id column to group_id');
      } else {
        // Add group_id as primary key
        await sequelize.query(`
          ALTER TABLE \`groups\`
          ADD COLUMN \`group_id\` CHAR(36) NOT NULL PRIMARY KEY FIRST
        `, { type: QueryTypes.RAW });
        console.log('✅ Added group_id column as primary key');
      }
    } else {
      console.log('✅ group_id column already exists');
    }

    // Check and add group_name if missing
    if (!existingColumnNames.includes('group_name')) {
      console.log('🔧 Adding group_name column...');
      await sequelize.query(`
        ALTER TABLE \`groups\`
        ADD COLUMN \`group_name\` VARCHAR(255) NOT NULL DEFAULT '' AFTER \`group_id\`
      `, { type: QueryTypes.RAW });
      await sequelize.query(`
        ALTER TABLE \`groups\`
        MODIFY COLUMN \`group_name\` VARCHAR(255) NOT NULL
      `, { type: QueryTypes.RAW });
      console.log('✅ group_name column added');
    } else {
      console.log('✅ group_name column already exists');
    }

    // Check and add description if missing
    if (!existingColumnNames.includes('description')) {
      console.log('🔧 Adding description column...');
      await sequelize.query(`
        ALTER TABLE \`groups\`
        ADD COLUMN \`description\` TEXT NULL
      `, { type: QueryTypes.RAW });
      console.log('✅ description column added');
    } else {
      console.log('✅ description column already exists');
    }

    // Check and add org_id if missing
    if (!existingColumnNames.includes('org_id')) {
      console.log('🔧 Adding org_id column...');
      await sequelize.query(`
        ALTER TABLE \`groups\`
        ADD COLUMN \`org_id\` CHAR(36) NULL
      `, { type: QueryTypes.RAW });
      console.log('✅ org_id column added');
    } else {
      console.log('✅ org_id column already exists');
    }

    // Check and add is_active if missing
    if (!existingColumnNames.includes('is_active')) {
      console.log('🔧 Adding is_active column...');
      await sequelize.query(`
        ALTER TABLE \`groups\`
        ADD COLUMN \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE
      `, { type: QueryTypes.RAW });
      console.log('✅ is_active column added');
    } else {
      console.log('✅ is_active column already exists');
    }

    // Check and add timestamps if missing
    if (!existingColumnNames.includes('created_at')) {
      console.log('🔧 Adding created_at column...');
      await sequelize.query(`
        ALTER TABLE \`groups\`
        ADD COLUMN \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      `, { type: QueryTypes.RAW });
      console.log('✅ created_at column added');
    } else {
      console.log('✅ created_at column already exists');
    }

    if (!existingColumnNames.includes('updated_at')) {
      console.log('🔧 Adding updated_at column...');
      await sequelize.query(`
        ALTER TABLE \`groups\`
        ADD COLUMN \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `, { type: QueryTypes.RAW });
      console.log('✅ updated_at column added');
    } else {
      console.log('✅ updated_at column already exists');
    }

    // Check and add indexes
    const indexes = await sequelize.query(`
      SELECT INDEX_NAME 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'groups'
    `, { type: QueryTypes.SELECT });

    const existingIndexNames = Array.isArray(indexes) && indexes.length > 0
      ? indexes.map(idx => idx.INDEX_NAME || idx[0] || idx)
      : [];

    if (!existingIndexNames.includes('idx_group_name')) {
      console.log('🔧 Adding index on group_name...');
      await sequelize.query(`
        ALTER TABLE \`groups\`
        ADD INDEX \`idx_group_name\` (\`group_name\`)
      `, { type: QueryTypes.RAW });
      console.log('✅ Index added on group_name');
    } else {
      console.log('✅ Index on group_name already exists');
    }

    if (!existingIndexNames.includes('idx_org_id')) {
      console.log('🔧 Adding index on org_id...');
      await sequelize.query(`
        ALTER TABLE \`groups\`
        ADD INDEX \`idx_org_id\` (\`org_id\`)
      `, { type: QueryTypes.RAW });
      console.log('✅ Index added on org_id');
    } else {
      console.log('✅ Index on org_id already exists');
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
  fixGroupsTableComplete();
}

export default fixGroupsTableComplete;

