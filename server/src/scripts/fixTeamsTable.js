import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * Fix teams table: Convert id (INT) to team_id (CHAR(36))
 * This handles the foreign key constraint from case_reason_configs
 */

const fixTeamsTable = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Step 1: Find and drop foreign key constraints that reference teams.id
    console.log('\nStep 1: Finding and dropping foreign key constraints...');
    const fks = await sequelize.query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND REFERENCED_TABLE_NAME = 'teams'
      AND REFERENCED_COLUMN_NAME = 'id'
    `, { type: QueryTypes.SELECT });

    if (fks && fks.length > 0) {
      for (const fk of fks) {
        const fkName = fk.CONSTRAINT_NAME || (Array.isArray(fk) ? fk[0] : null);
        const tableName = fk.TABLE_NAME || (Array.isArray(fk) ? fk[1] : null);
        if (fkName && tableName) {
          try {
            await sequelize.query(`
              ALTER TABLE \`${tableName}\`
              DROP FOREIGN KEY \`${fkName}\`
            `, { type: QueryTypes.RAW });
            console.log(`✅ Dropped foreign key ${fkName} from ${tableName}`);
          } catch (error) {
            if (error.message.includes('Unknown key') || error.message.includes('doesn\'t exist') || error.message.includes('check that column')) {
              console.log(`ℹ️  Foreign key ${fkName} does not exist (may have been dropped already)`);
            } else {
              console.log(`⚠️  Could not drop foreign key ${fkName}: ${error.message}`);
            }
          }
        }
      }
    } else {
      console.log('ℹ️  No foreign key constraints found referencing teams.id');
    }

    // Step 2: Check if team_id already exists
    const columns = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'teams'
      AND COLUMN_NAME = 'team_id'
    `, { type: QueryTypes.SELECT });

    const hasTeamId = Array.isArray(columns) && columns.length > 0 && 
                      (columns[0]?.COLUMN_NAME === 'team_id' || 
                       (Array.isArray(columns[0]) && columns[0][0] === 'team_id'));

    // Check if team_id is the primary key
    const [pkInfo] = await sequelize.query(`
      SELECT COLUMN_NAME, COLUMN_KEY
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'teams'
      AND COLUMN_NAME = 'team_id'
    `, { type: QueryTypes.SELECT });

    const isTeamIdPrimary = pkInfo && (pkInfo.COLUMN_KEY === 'PRI' || (Array.isArray(pkInfo) && pkInfo[1] === 'PRI'));

    if (hasTeamId && isTeamIdPrimary) {
      console.log('ℹ️  team_id column already exists and is primary key');
    } else if (hasTeamId && !isTeamIdPrimary) {
      console.log('⚠️  team_id column exists but is not primary key. Fixing...');
      
      // Ensure all rows have team_id values
      const [teamsWithoutUuid] = await sequelize.query(`
        SELECT id FROM \`teams\` WHERE team_id IS NULL
      `, { type: QueryTypes.SELECT });

      if (teamsWithoutUuid && teamsWithoutUuid.length > 0) {
        const generateUUID = () => {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };

        for (const team of teamsWithoutUuid) {
          const uuid = generateUUID();
          const teamId = team.id || team.ID || team[Object.keys(team)[0]];
          await sequelize.query(`
            UPDATE \`teams\`
            SET \`team_id\` = :uuid
            WHERE \`id\` = :id
          `, {
            replacements: { uuid, id: teamId },
            type: QueryTypes.UPDATE
          });
        }
        console.log(`   ✅ Generated UUIDs for ${teamsWithoutUuid.length} teams`);
      }

      // Set team_id as primary key
      try {
        await sequelize.query(`
          ALTER TABLE \`teams\`
          MODIFY COLUMN \`team_id\` CHAR(36) NOT NULL,
          DROP PRIMARY KEY,
          ADD PRIMARY KEY (\`team_id\`)
        `, { type: QueryTypes.RAW });
        console.log('✅ Set team_id as primary key');
      } catch (error) {
        console.log(`⚠️  Could not set team_id as primary key: ${error.message}`);
        // Try alternative: just add index if primary key change fails
        try {
          await sequelize.query(`
            ALTER TABLE \`teams\`
            ADD INDEX \`idx_team_id_pk\` (\`team_id\`)
          `, { type: QueryTypes.RAW });
          console.log('✅ Added index on team_id');
        } catch (idxError) {
          console.log(`⚠️  Could not add index: ${idxError.message}`);
        }
      }
    } else {
      // Step 3: Add team_id column
      console.log('\nStep 2: Adding team_id column...');
      await sequelize.query(`
        ALTER TABLE \`teams\`
        ADD COLUMN \`team_id\` CHAR(36) NULL AFTER \`id\`
      `, { type: QueryTypes.RAW });
      console.log('✅ Added team_id column');

      // Step 4: Generate UUIDs for existing rows
      console.log('\nStep 3: Generating UUIDs for existing rows...');
      const [teams] = await sequelize.query(`
        SELECT id FROM \`teams\` WHERE team_id IS NULL
      `, { type: QueryTypes.SELECT });

      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      for (const team of teams || []) {
        const uuid = generateUUID();
        const teamId = team.id || team.ID || team[Object.keys(team)[0]];
        await sequelize.query(`
          UPDATE \`teams\`
          SET \`team_id\` = :uuid
          WHERE \`id\` = :id
        `, {
          replacements: { uuid, id: teamId },
          type: QueryTypes.UPDATE
        });
      }
      console.log(`✅ Generated UUIDs for ${(teams || []).length} teams`);

      // Step 5: Make team_id NOT NULL and set as primary key
      console.log('\nStep 4: Setting team_id as primary key...');
      await sequelize.query(`
        ALTER TABLE \`teams\`
        MODIFY COLUMN \`team_id\` CHAR(36) NOT NULL,
        DROP PRIMARY KEY,
        ADD PRIMARY KEY (\`team_id\`)
      `, { type: QueryTypes.RAW });
      console.log('✅ Set team_id as primary key');
    }

    // Step 6: Fix case_reason_configs.team_id type to match teams.team_id
    console.log('\nStep 5: Fixing case_reason_configs.team_id column type...');
    try {
      // Check current type
      const [colInfo] = await sequelize.query(`
        SELECT DATA_TYPE, COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'case_reason_configs'
        AND COLUMN_NAME = 'team_id'
      `, { type: QueryTypes.SELECT });

      if (colInfo && (colInfo.DATA_TYPE === 'int' || colInfo.DATA_TYPE === 'integer')) {
        console.log('   Converting case_reason_configs.team_id from INT to CHAR(36)...');
        
        // First, get mapping of old id to new team_id
        const [idMapping] = await sequelize.query(`
          SELECT id, team_id FROM \`teams\`
        `, { type: QueryTypes.SELECT });

        const idToUuidMap = {};
        if (idMapping && Array.isArray(idMapping)) {
          for (const row of idMapping) {
            const oldId = row.id || row.ID || row[Object.keys(row)[0]];
            const newUuid = row.team_id || row.TEAM_ID || row[Object.keys(row)[1]];
            if (oldId && newUuid) {
              idToUuidMap[oldId] = newUuid;
            }
          }
        }

        // Update case_reason_configs.team_id values to UUIDs
        if (Object.keys(idToUuidMap).length > 0) {
          for (const [oldId, newUuid] of Object.entries(idToUuidMap)) {
            await sequelize.query(`
              UPDATE \`case_reason_configs\`
              SET \`team_id\` = :uuid
              WHERE \`team_id\` = :oldId
            `, {
              replacements: { uuid: newUuid, oldId: parseInt(oldId) },
              type: QueryTypes.UPDATE
            });
          }
          console.log(`   ✅ Updated ${Object.keys(idToUuidMap).length} team_id references`);
        }

        // Change column type
        await sequelize.query(`
          ALTER TABLE \`case_reason_configs\`
          MODIFY COLUMN \`team_id\` CHAR(36) NULL
        `, { type: QueryTypes.RAW });
        console.log('✅ Changed case_reason_configs.team_id to CHAR(36)');
      } else {
        console.log('ℹ️  case_reason_configs.team_id is already the correct type');
      }
    } catch (error) {
      console.log(`⚠️  Could not update case_reason_configs.team_id: ${error.message}`);
    }

    // Step 7: Update foreign key to reference team_id
    console.log('\nStep 6: Recreating foreign key constraint...');
    try {
      await sequelize.query(`
        ALTER TABLE \`case_reason_configs\`
        ADD CONSTRAINT \`case_reason_configs_ibfk_4\` 
        FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`team_id\`) ON DELETE SET NULL
      `, { type: QueryTypes.RAW });
      console.log('✅ Recreated foreign key constraint');
    } catch (error) {
      if (error.message.includes('Duplicate key') || error.message.includes('already exists')) {
        console.log('ℹ️  Foreign key constraint already exists');
      } else {
        console.log(`⚠️  Could not recreate foreign key: ${error.message}`);
      }
    }

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

fixTeamsTable();

