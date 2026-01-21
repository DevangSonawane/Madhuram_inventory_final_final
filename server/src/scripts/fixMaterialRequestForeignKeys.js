import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * Fix foreign key constraints on material_requests table
 * The issue is that foreign keys reference team_id and group_id, but those columns
 * might not be primary keys or unique keys in the referenced tables
 */

const fixMaterialRequestForeignKeys = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Get all foreign keys on material_requests
    const fks = await sequelize.query(`
      SELECT 
        k.CONSTRAINT_NAME,
        k.COLUMN_NAME,
        k.REFERENCED_TABLE_NAME,
        k.REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
      WHERE k.TABLE_SCHEMA = DATABASE() 
      AND k.TABLE_NAME = 'material_requests'
      AND k.REFERENCED_TABLE_NAME IS NOT NULL
    `, { type: QueryTypes.SELECT });

    console.log('\n📋 Found foreign keys on material_requests:');
    if (fks && Array.isArray(fks) && fks.length > 0) {
      for (const fk of fks) {
        const fkName = fk.CONSTRAINT_NAME || (Array.isArray(fk) ? fk[0] : null);
        const colName = fk.COLUMN_NAME || (Array.isArray(fk) ? fk[1] : null);
        const refTable = fk.REFERENCED_TABLE_NAME || (Array.isArray(fk) ? fk[2] : null);
        const refCol = fk.REFERENCED_COLUMN_NAME || (Array.isArray(fk) ? fk[3] : null);
        console.log(`  - ${fkName}: ${colName} -> ${refTable}.${refCol}`);
      }
    } else {
      console.log('  No foreign keys found');
    }

    // Check if teams.team_id is a primary key or unique
    const [teamPk] = await sequelize.query(`
      SELECT COLUMN_NAME, COLUMN_KEY, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'teams'
      AND COLUMN_NAME = 'team_id'
    `, { type: QueryTypes.SELECT });

    const teamIdIsPk = teamPk && (teamPk.COLUMN_KEY === 'PRI' || (Array.isArray(teamPk) && teamPk[1] === 'PRI'));

    // Check if groups.group_id is a primary key or unique
    const [groupPk] = await sequelize.query(`
      SELECT COLUMN_NAME, COLUMN_KEY, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'groups'
      AND COLUMN_NAME = 'group_id'
    `, { type: QueryTypes.SELECT });

    const groupIdIsPk = groupPk && (groupPk.COLUMN_KEY === 'PRI' || (Array.isArray(groupPk) && groupPk[1] === 'PRI'));

    console.log('\n🔍 Checking referenced columns:');
    console.log(`  teams.team_id is primary key: ${teamIdIsPk}`);
    console.log(`  groups.group_id is primary key: ${groupIdIsPk}`);

    // Drop problematic foreign keys if the referenced columns are not primary/unique
    if (fks && Array.isArray(fks) && fks.length > 0) {
      for (const fk of fks) {
        const fkName = fk.CONSTRAINT_NAME || (Array.isArray(fk) ? fk[0] : null);
        const colName = fk.COLUMN_NAME || (Array.isArray(fk) ? fk[1] : null);
        const refTable = fk.REFERENCED_TABLE_NAME || (Array.isArray(fk) ? fk[2] : null);
        const refCol = fk.REFERENCED_COLUMN_NAME || (Array.isArray(fk) ? fk[3] : null);

        // Skip created_by and requestor_id foreign keys (they reference users.id which is a primary key)
        if (colName === 'created_by' || colName === 'requestor_id') {
          if (refTable === 'users' && refCol === 'id') {
            console.log(`\n✅ Keeping foreign key ${fkName} (${colName} -> users.id is valid)`);
            continue;
          }
        }

        // Check if this foreign key references backup tables (incorrect)
        let shouldDrop = false;
        if (refTable && refTable.includes('_backup')) {
          shouldDrop = true;
          console.log(`\n⚠️  Foreign key ${fkName} references backup table ${refTable} - will drop and recreate`);
        } else if (colName === 'team_id' && refTable === 'teams' && refCol === 'team_id' && !teamIdIsPk) {
          shouldDrop = true;
          console.log(`\n⚠️  Foreign key ${fkName} is invalid: teams.team_id is not a primary key`);
        } else if (colName === 'group_id' && refTable === 'groups' && refCol === 'group_id' && !groupIdIsPk) {
          shouldDrop = true;
          console.log(`\n⚠️  Foreign key ${fkName} is invalid: groups.group_id is not a primary key`);
        }

        if (shouldDrop && fkName) {
          try {
            console.log(`\n🗑️  Dropping foreign key ${fkName}...`);
            await sequelize.query(`
              ALTER TABLE \`material_requests\`
              DROP FOREIGN KEY \`${fkName}\`
            `, { type: QueryTypes.RAW });
            console.log(`✅ Dropped foreign key ${fkName}`);
          } catch (dropError) {
            console.log(`⚠️  Could not drop foreign key ${fkName}: ${dropError.message}`);
          }
        }
      }
    }

    // Make teams.team_id unique if it's not already a primary key
    if (!teamIdIsPk) {
      try {
        console.log('\n🔧 Making teams.team_id unique...');
        await sequelize.query(`
          ALTER TABLE \`teams\`
          ADD UNIQUE INDEX \`unique_team_id\` (\`team_id\`)
        `, { type: QueryTypes.RAW });
        console.log('✅ Made teams.team_id unique');
      } catch (uniqueError) {
        if (uniqueError.message.includes('Duplicate') || uniqueError.message.includes('already exists')) {
          console.log('ℹ️  teams.team_id already has a unique constraint');
        } else {
          console.log(`⚠️  Could not make teams.team_id unique: ${uniqueError.message}`);
        }
      }
    }

    // Make groups.group_id unique if it's not already a primary key
    if (!groupIdIsPk) {
      try {
        console.log('\n🔧 Making groups.group_id unique...');
        await sequelize.query(`
          ALTER TABLE \`groups\`
          ADD UNIQUE INDEX \`unique_group_id\` (\`group_id\`)
        `, { type: QueryTypes.RAW });
        console.log('✅ Made groups.group_id unique');
      } catch (uniqueError) {
        if (uniqueError.message.includes('Duplicate') || uniqueError.message.includes('already exists')) {
          console.log('ℹ️  groups.group_id already has a unique constraint');
        } else {
          console.log(`⚠️  Could not make groups.group_id unique: ${uniqueError.message}`);
        }
      }
    }

    // Recreate foreign keys if they were dropped and the referenced columns are now unique
    if (fks && Array.isArray(fks) && fks.length > 0) {
      for (const fk of fks) {
        const fkName = fk.CONSTRAINT_NAME || (Array.isArray(fk) ? fk[0] : null);
        const colName = fk.COLUMN_NAME || (Array.isArray(fk) ? fk[1] : null);
        const refTable = fk.REFERENCED_TABLE_NAME || (Array.isArray(fk) ? fk[2] : null);
        const refCol = fk.REFERENCED_COLUMN_NAME || (Array.isArray(fk) ? fk[3] : null);

        // Skip created_by and requestor_id (already exist and are valid)
        if (colName === 'created_by' || colName === 'requestor_id') continue;

        // Fix references to backup tables
        let correctRefTable = refTable;
        if (refTable && refTable.includes('_backup')) {
          // Remove _backup suffix
          correctRefTable = refTable.replace('_backup', '');
          console.log(`\n🔧 Fixing reference: ${refTable} -> ${correctRefTable}`);
        }

        // Check if we need to recreate this foreign key
        const [existingFk] = await sequelize.query(`
          SELECT CONSTRAINT_NAME
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'material_requests'
          AND CONSTRAINT_NAME = :fkName
        `, {
          replacements: { fkName },
          type: QueryTypes.SELECT
        });

        if (!existingFk && fkName && colName && correctRefTable && refCol) {
          // First, clean up invalid foreign key references
          try {
            console.log(`\n🧹 Cleaning up invalid ${colName} references...`);
            
            // Get all distinct values of this column from material_requests
            const [invalidRefs] = await sequelize.query(`
              SELECT DISTINCT \`${colName}\`
              FROM \`material_requests\`
              WHERE \`${colName}\` IS NOT NULL
            `, { type: QueryTypes.SELECT });

            if (invalidRefs && Array.isArray(invalidRefs) && invalidRefs.length > 0) {
              // Check which references are valid
              const [validRefs] = await sequelize.query(`
                SELECT \`${refCol}\`
                FROM \`${correctRefTable}\`
              `, { type: QueryTypes.SELECT });

              const validRefSet = new Set();
              if (validRefs && Array.isArray(validRefs)) {
                for (const ref of validRefs) {
                  const refValue = ref[refCol] || ref[refCol.toUpperCase()] || (Array.isArray(ref) ? ref[0] : Object.values(ref)[0]);
                  if (refValue) validRefSet.add(String(refValue));
                }
              }

              // Set invalid references to NULL
              let cleanedCount = 0;
              for (const invalidRef of invalidRefs) {
                const refValue = invalidRef[colName] || invalidRef[colName.toUpperCase()] || (Array.isArray(invalidRef) ? invalidRef[0] : Object.values(invalidRef)[0]);
                if (refValue && !validRefSet.has(String(refValue))) {
                  await sequelize.query(`
                    UPDATE \`material_requests\`
                    SET \`${colName}\` = NULL
                    WHERE \`${colName}\` = :refValue
                  `, {
                    replacements: { refValue },
                    type: QueryTypes.UPDATE
                  });
                  cleanedCount++;
                }
              }
              if (cleanedCount > 0) {
                console.log(`   ✅ Cleaned up ${cleanedCount} invalid ${colName} references`);
              } else {
                console.log(`   ℹ️  All ${colName} references are valid`);
              }
            }
          } catch (cleanupError) {
            console.log(`⚠️  Could not clean up invalid references: ${cleanupError.message}`);
          }

          // Now try to recreate the foreign key
          try {
            console.log(`\n🔧 Recreating foreign key ${fkName} (${colName} -> ${correctRefTable}.${refCol})...`);
            await sequelize.query(`
              ALTER TABLE \`material_requests\`
              ADD CONSTRAINT \`${fkName}\` 
              FOREIGN KEY (\`${colName}\`) REFERENCES \`${correctRefTable}\`(\`${refCol}\`) 
              ON DELETE SET NULL
            `, { type: QueryTypes.RAW });
            console.log(`✅ Recreated foreign key ${fkName}`);
          } catch (recreateError) {
            console.log(`⚠️  Could not recreate foreign key ${fkName}: ${recreateError.message}`);
            console.log(`   ℹ️  Foreign key constraint will not be enforced. Application-level validation will handle this.`);
          }
        }
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

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('fixMaterialRequestForeignKeys')) {
  fixMaterialRequestForeignKeys();
}

export default fixMaterialRequestForeignKeys;

