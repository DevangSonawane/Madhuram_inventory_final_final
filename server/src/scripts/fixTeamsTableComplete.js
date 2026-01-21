import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * Complete fix for teams table - ensures all required columns exist
 * Run this if you get "Unknown column 'team_id' in 'field list'" error
 */
const fixTeamsTableComplete = async () => {
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
      console.log('🔧 teams table does not exist. Creating it...');
      await sequelize.query(`
        CREATE TABLE \`teams\` (
          \`team_id\` CHAR(36) NOT NULL PRIMARY KEY,
          \`team_name\` VARCHAR(255) NOT NULL,
          \`group_id\` CHAR(36) NULL,
          \`description\` TEXT NULL,
          \`org_id\` CHAR(36) NULL,
          \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_team_name\` (\`team_name\`),
          INDEX \`idx_group_id\` (\`group_id\`),
          INDEX \`idx_org_id\` (\`org_id\`),
          FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`group_id\`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `, { type: QueryTypes.RAW });
      console.log('✅ teams table created');
      await sequelize.close();
      process.exit(0);
      return;
    }

    console.log('🔧 Fixing teams table structure...');

    // Get all existing columns
    const allColumns = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'teams'
      ORDER BY ORDINAL_POSITION
    `, { type: QueryTypes.SELECT });

    const existingColumnNames = Array.isArray(allColumns) && allColumns.length > 0
      ? allColumns.map(col => col.COLUMN_NAME || col[0] || col)
      : [];
    console.log('Current columns:', existingColumnNames.join(', '));

    // Check and add team_id if missing (this is the primary key)
    if (!existingColumnNames.includes('team_id')) {
      console.log('🔧 Adding team_id column...');
      
      // Check if there's an 'id' column we should rename
      if (existingColumnNames.includes('id')) {
        // Rename id to team_id
        await sequelize.query(`
          ALTER TABLE \`teams\`
          CHANGE COLUMN \`id\` \`team_id\` CHAR(36) NOT NULL
        `, { type: QueryTypes.RAW });
        console.log('✅ Renamed id column to team_id');
      } else {
        // Add team_id as primary key
        await sequelize.query(`
          ALTER TABLE \`teams\`
          ADD COLUMN \`team_id\` CHAR(36) NOT NULL PRIMARY KEY FIRST
        `, { type: QueryTypes.RAW });
        console.log('✅ Added team_id column as primary key');
      }
    } else {
      console.log('✅ team_id column already exists');
    }

    // Check and add team_name if missing
    if (!existingColumnNames.includes('team_name')) {
      console.log('🔧 Adding team_name column...');
      await sequelize.query(`
        ALTER TABLE \`teams\`
        ADD COLUMN \`team_name\` VARCHAR(255) NOT NULL DEFAULT '' AFTER \`team_id\`
      `, { type: QueryTypes.RAW });
      await sequelize.query(`
        ALTER TABLE \`teams\`
        MODIFY COLUMN \`team_name\` VARCHAR(255) NOT NULL
      `, { type: QueryTypes.RAW });
      console.log('✅ team_name column added');
    } else {
      console.log('✅ team_name column already exists');
    }

    // Check and add group_id if missing
    if (!existingColumnNames.includes('group_id')) {
      console.log('🔧 Adding group_id column...');
      await sequelize.query(`
        ALTER TABLE \`teams\`
        ADD COLUMN \`group_id\` CHAR(36) NULL AFTER \`team_name\`
      `, { type: QueryTypes.RAW });
      console.log('✅ group_id column added');
    } else {
      console.log('✅ group_id column already exists');
    }

    // Check and add description if missing
    if (!existingColumnNames.includes('description')) {
      console.log('🔧 Adding description column...');
      await sequelize.query(`
        ALTER TABLE \`teams\`
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
        ALTER TABLE \`teams\`
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
        ALTER TABLE \`teams\`
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
        ALTER TABLE \`teams\`
        ADD COLUMN \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      `, { type: QueryTypes.RAW });
      console.log('✅ created_at column added');
    } else {
      console.log('✅ created_at column already exists');
    }

    if (!existingColumnNames.includes('updated_at')) {
      console.log('🔧 Adding updated_at column...');
      await sequelize.query(`
        ALTER TABLE \`teams\`
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
      AND TABLE_NAME = 'teams'
    `, { type: QueryTypes.SELECT });

    const existingIndexNames = Array.isArray(indexes) && indexes.length > 0
      ? indexes.map(idx => idx.INDEX_NAME || idx[0] || idx)
      : [];

    if (!existingIndexNames.includes('idx_team_name')) {
      console.log('🔧 Adding index on team_name...');
      await sequelize.query(`
        ALTER TABLE \`teams\`
        ADD INDEX \`idx_team_name\` (\`team_name\`)
      `, { type: QueryTypes.RAW });
      console.log('✅ Index added on team_name');
    } else {
      console.log('✅ Index on team_name already exists');
    }

    if (!existingIndexNames.includes('idx_group_id')) {
      console.log('🔧 Adding index on group_id...');
      await sequelize.query(`
        ALTER TABLE \`teams\`
        ADD INDEX \`idx_group_id\` (\`group_id\`)
      `, { type: QueryTypes.RAW });
      console.log('✅ Index added on group_id');
    } else {
      console.log('✅ Index on group_id already exists');
    }

    if (!existingIndexNames.includes('idx_org_id')) {
      console.log('🔧 Adding index on org_id...');
      await sequelize.query(`
        ALTER TABLE \`teams\`
        ADD INDEX \`idx_org_id\` (\`org_id\`)
      `, { type: QueryTypes.RAW });
      console.log('✅ Index added on org_id');
    } else {
      console.log('✅ Index on org_id already exists');
    }

    // Add foreign key if it doesn't exist
    try {
      const [fks] = await sequelize.query(`
        SELECT CONSTRAINT_NAME 
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'teams'
        AND COLUMN_NAME = 'group_id'
        AND REFERENCED_TABLE_NAME = 'groups'
      `, { type: QueryTypes.SELECT });

      if (!fks || fks.length === 0) {
        console.log('🔧 Adding foreign key to groups...');
        await sequelize.query(`
          ALTER TABLE \`teams\`
          ADD CONSTRAINT \`fk_team_group\` FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`group_id\`) ON DELETE SET NULL
        `, { type: QueryTypes.RAW });
        console.log('✅ Foreign key added');
      } else {
        console.log('✅ Foreign key already exists');
      }
    } catch (e) {
      console.log('⚠️  Could not add foreign key (may already exist):', e.message);
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
  fixTeamsTableComplete();
}

export default fixTeamsTableComplete;

