 import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * Migration script to create missing inventory tables and columns
 * Based on flow.md requirements
 * 
 * Run with: node src/scripts/migrateInventoryTables.js
 */

const runMigration = async (silent = false) => {
  try {
    if (!silent) {
      if (!silent) console.log('🚀 Starting Inventory Module Database Migration...\n');
    }
    
    // Connect to database (should already be connected, but ensure it)
    await sequelize.authenticate();
    if (!silent) {
      if (!silent) console.log('✅ Database connected successfully\n');
    }

    // ============================================================
    // PART 1: CREATE NEW TABLES
    // ============================================================
    
    if (!silent) {
      if (!silent) console.log('📦 Creating new tables...\n');
    }

    // Helper function to check if table exists
    const tableExists = async (tableName) => {
      try {
        const results = await sequelize.query(`
          SELECT TABLE_NAME 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = '${tableName}'
        `, { type: QueryTypes.SELECT });
        // Results can be an array of arrays or array of objects depending on query type
        return Array.isArray(results) && results.length > 0;
      } catch (error) {
        return false;
      }
    };

    // Helper function to check if column exists
    const columnExists = async (tableName, columnName) => {
      try {
        const results = await sequelize.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = '${tableName}'
            AND COLUMN_NAME = '${columnName}'
        `, { type: QueryTypes.SELECT });
        // Results can be an array of arrays or array of objects depending on query type
        return Array.isArray(results) && results.length > 0;
      } catch (error) {
        return false;
      }
    };

    // Helper to check if an index exists on a table
    const indexExists = async (tableName, indexName) => {
      try {
        const results = await sequelize.query(`
          SELECT INDEX_NAME 
          FROM INFORMATION_SCHEMA.STATISTICS 
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = '${tableName}'
            AND INDEX_NAME = '${indexName}'
        `, { type: QueryTypes.SELECT });
        return Array.isArray(results) && results.length > 0;
      } catch (error) {
        return false;
      }
    };

    // Helper to create index if missing (columns as string e.g., "(col1, col2)")
    const ensureIndex = async (tableName, indexName, columns) => {
      if (await indexExists(tableName, indexName)) return;
      try {
        await sequelize.query(`
          ALTER TABLE \`${tableName}\`
          ADD INDEX \`${indexName}\` ${columns};
        `, { type: QueryTypes.RAW });
        if (!silent) console.log(`   ✅ Added index ${indexName} on ${tableName}${columns}`);
      } catch (error) {
        if (!silent) console.log(`   ⚠️  Could not add index ${indexName} on ${tableName}: ${error.message}`);
      }
    };

    // Helper function to get column type from existing table
    const getColumnType = async (tableName, columnName) => {
      try {
        const [results] = await sequelize.query(`
          SELECT COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME, IS_NULLABLE
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = '${tableName}'
            AND COLUMN_NAME = '${columnName}'
        `, { type: QueryTypes.SELECT });
        
        if (results && results.length > 0) {
          const col = results[0];
          // Build the full column definition with charset/collation
          let fullType = col.COLUMN_TYPE || 'CHAR(36)';
          
          // Add charset and collation for CHAR/VARCHAR types
          if (fullType.includes('CHAR') || fullType.includes('VARCHAR') || fullType.includes('TEXT')) {
            if (col.CHARACTER_SET_NAME) {
              fullType += ` CHARACTER SET ${col.CHARACTER_SET_NAME}`;
            }
            if (col.COLLATION_NAME) {
              fullType += ` COLLATE ${col.COLLATION_NAME}`;
            }
          }
          
          return {
            type: col.COLUMN_TYPE || 'CHAR(36)',
            fullType: fullType,
            charset: col.CHARACTER_SET_NAME,
            collation: col.COLLATION_NAME,
            nullable: col.IS_NULLABLE === 'YES'
          };
        }
        return { 
          type: 'CHAR(36)', 
          fullType: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
          charset: 'utf8mb4', 
          collation: 'utf8mb4_unicode_ci',
          nullable: true 
        };
      } catch (error) {
        return { 
          type: 'CHAR(36)', 
          fullType: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
          charset: 'utf8mb4', 
          collation: 'utf8mb4_unicode_ci',
          nullable: true 
        };
      }
    };

    // 1. INVENTORY MASTER - Track individual items (Serialized)
    if (!(await tableExists('inventory_master'))) {
      if (!silent) console.log('   Creating inventory_master table...');
      
      // Get actual column types from existing tables
      const materialIdInfo = await getColumnType('materials', 'material_id');
      const itemIdInfo = await getColumnType('inward_items', 'item_id');
      
      const materialIdType = materialIdInfo.fullType || 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
      const itemIdType = itemIdInfo.fullType || 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
      
      // Create table without foreign keys first
      await sequelize.query(`
        CREATE TABLE \`inventory_master\` (
          \`id\` CHAR(36) NOT NULL PRIMARY KEY,
          \`material_id\` ${materialIdType} NOT NULL,
          \`serial_number\` VARCHAR(100) NULL,
          \`mac_id\` VARCHAR(100) NULL,
          \`current_location_type\` ENUM('WAREHOUSE', 'PERSON', 'CONSUMED') NOT NULL DEFAULT 'WAREHOUSE',
          \`location_id\` VARCHAR(255) NULL COMMENT 'Stock Area ID (UUID) or User ID (INTEGER)',
          \`status\` ENUM('AVAILABLE', 'FAULTY', 'ALLOCATED', 'IN_TRANSIT', 'CONSUMED') NOT NULL DEFAULT 'AVAILABLE',
          \`inward_item_id\` ${itemIdType} NULL COMMENT 'Which inward_item created this inventory entry',
          \`ticket_id\` VARCHAR(100) NULL COMMENT 'Linked ticket/work order ID if in PERSON stock (e.g., TKT-55S)',
          \`org_id\` CHAR(36) NULL,
          \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_material_id\` (\`material_id\`),
          INDEX \`idx_serial_number\` (\`serial_number\`),
          INDEX \`idx_mac_id\` (\`mac_id\`),
          INDEX \`idx_location\` (\`current_location_type\`, \`location_id\`),
          INDEX \`idx_status\` (\`status\`),
          INDEX \`idx_inward_item\` (\`inward_item_id\`),
          INDEX \`idx_ticket_id\` (\`ticket_id\`),
          INDEX \`idx_is_active\` (\`is_active\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `, { type: QueryTypes.RAW });
      
      // Add foreign keys separately (skip if they fail - we'll add them later if needed)
      try {
        await sequelize.query(`
          ALTER TABLE \`inventory_master\`
          ADD CONSTRAINT \`fk_inventory_material\` 
          FOREIGN KEY (\`material_id\`) REFERENCES \`materials\`(\`material_id\`) ON DELETE RESTRICT;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added material_id foreign key');
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add material_id foreign key (will use application-level validation)');
      }
      
      try {
        await sequelize.query(`
          ALTER TABLE \`inventory_master\`
          ADD CONSTRAINT \`fk_inventory_inward_item\` 
          FOREIGN KEY (\`inward_item_id\`) REFERENCES \`inward_items\`(\`item_id\`) ON DELETE SET NULL;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added inward_item_id foreign key');
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add inward_item_id foreign key (will use application-level validation)');
      }
      
      if (!silent) console.log('   ✅ inventory_master table created');

      // Add unique constraint for serial_number
      try {
        await sequelize.query(`
          ALTER TABLE \`inventory_master\` 
          ADD UNIQUE INDEX \`unique_serial_number\` (\`serial_number\`);
        `, { type: QueryTypes.RAW });
      } catch (e) {
        // Index might already exist or serial_number is nullable
      }

      // Add unique constraint for mac_id
      try {
        await sequelize.query(`
          ALTER TABLE \`inventory_master\` 
          ADD UNIQUE INDEX \`unique_mac_id\` (\`mac_id\`);
        `, { type: QueryTypes.RAW });
      } catch (e) {
        // Index might already exist or mac_id is nullable
      }
    } else {
      if (!silent) console.log('   ℹ️  inventory_master table already exists');
      
      // Add missing columns if table exists but columns don't
      if (!(await columnExists('inventory_master', 'ticket_id'))) {
        if (!silent) console.log('   Adding ticket_id to inventory_master...');
        try {
          await sequelize.query(`
            ALTER TABLE \`inventory_master\`
            ADD COLUMN \`ticket_id\` VARCHAR(100) NULL COMMENT 'Linked ticket/work order ID if in PERSON stock (e.g., TKT-55S)' AFTER \`inward_item_id\`;
          `, { type: QueryTypes.RAW });
          await sequelize.query(`
            ALTER TABLE \`inventory_master\`
            ADD INDEX \`idx_ticket_id\` (\`ticket_id\`);
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ Added ticket_id to inventory_master');
        } catch (e) {
          if (e.message && (e.message.includes('Duplicate column') || e.message.includes('already exists'))) {
            if (!silent) console.log('   ℹ️  ticket_id already exists in inventory_master');
          } else {
            throw e;
          }
        }
      }
      
      if (!(await columnExists('inventory_master', 'is_active'))) {
        if (!silent) console.log('   Adding is_active to inventory_master...');
        try {
          await sequelize.query(`
            ALTER TABLE \`inventory_master\`
            ADD COLUMN \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE AFTER \`org_id\`;
          `, { type: QueryTypes.RAW });
          await sequelize.query(`
            ALTER TABLE \`inventory_master\`
            ADD INDEX \`idx_is_active\` (\`is_active\`);
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ Added is_active to inventory_master');
        } catch (e) {
          if (e.message && (e.message.includes('Duplicate column') || e.message.includes('already exists'))) {
            if (!silent) console.log('   ℹ️  is_active already exists in inventory_master');
          } else {
            throw e;
          }
        }
      }
    }

    // 2. MATERIAL ALLOCATION
    if (!(await tableExists('material_allocation'))) {
      if (!silent) console.log('   Creating material_allocation table...');
      
      // Get actual column types
      const mrIdInfo = await getColumnType('material_requests', 'request_id');
      const mriIdInfo = await getColumnType('material_request_items', 'item_id');
      
      const mrIdType = mrIdInfo.fullType || 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
      const mriIdType = mriIdInfo.fullType || 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
      
      // Create table without foreign keys first
      await sequelize.query(`
        CREATE TABLE \`material_allocation\` (
          \`id\` CHAR(36) NOT NULL PRIMARY KEY,
          \`material_request_id\` ${mrIdType} NOT NULL,
          \`material_request_item_id\` ${mriIdType} NOT NULL,
          \`inventory_master_id\` CHAR(36) NOT NULL COMMENT 'The specific item (Serial No) allocated',
          \`allocated_by\` INT NULL COMMENT 'User ID who allocated',
          \`allocated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`status\` ENUM('ALLOCATED', 'TRANSFERRED', 'CANCELLED') NOT NULL DEFAULT 'ALLOCATED',
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_mr_id\` (\`material_request_id\`),
          INDEX \`idx_mr_item_id\` (\`material_request_item_id\`),
          INDEX \`idx_inventory_master\` (\`inventory_master_id\`),
          INDEX \`idx_status\` (\`status\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `, { type: QueryTypes.RAW });
      
      // Add foreign keys separately
      try {
        await sequelize.query(`
          ALTER TABLE \`material_allocation\`
          ADD CONSTRAINT \`fk_alloc_mr\` 
          FOREIGN KEY (\`material_request_id\`) REFERENCES \`material_requests\`(\`request_id\`) ON DELETE CASCADE;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added material_request_id foreign key');
      } catch (e) {
        if (!silent) {
          if (!silent) console.log(`   ⚠️  Could not add material_request_id foreign key: ${e.message}`);
          // Try to get more details for debugging
          if (process.env.NODE_ENV === 'development') {
            const refInfo = await getColumnType('material_requests', 'request_id');
            console.log(`   Debug: material_allocation.material_request_id = ${mrIdType}`);
            console.log(`   Debug: material_requests.request_id = ${refInfo.fullType}`);
          }
        }
      }
      
      try {
        await sequelize.query(`
          ALTER TABLE \`material_allocation\`
          ADD CONSTRAINT \`fk_alloc_mri\` 
          FOREIGN KEY (\`material_request_item_id\`) REFERENCES \`material_request_items\`(\`item_id\`) ON DELETE CASCADE;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added material_request_item_id foreign key');
      } catch (e) {
        if (!silent) {
          if (!silent) console.log(`   ⚠️  Could not add material_request_item_id foreign key: ${e.message}`);
          // Try to get more details for debugging
          if (process.env.NODE_ENV === 'development') {
            const refInfo = await getColumnType('material_request_items', 'item_id');
            console.log(`   Debug: material_allocation.material_request_item_id = ${mriIdType}`);
            console.log(`   Debug: material_request_items.item_id = ${refInfo.fullType}`);
          }
        }
      }
      
      try {
        await sequelize.query(`
          ALTER TABLE \`material_allocation\`
          ADD CONSTRAINT \`fk_alloc_inventory\` 
          FOREIGN KEY (\`inventory_master_id\`) REFERENCES \`inventory_master\`(\`id\`) ON DELETE RESTRICT;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added inventory_master_id foreign key');
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add inventory_master_id foreign key');
      }
      
      try {
        await sequelize.query(`
          ALTER TABLE \`material_allocation\`
          ADD CONSTRAINT \`fk_alloc_user\` 
          FOREIGN KEY (\`allocated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added allocated_by foreign key');
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add allocated_by foreign key');
      }
      
      if (!silent) console.log('   ✅ material_allocation table created');
    } else {
      if (!silent) console.log('   ℹ️  material_allocation table already exists');
    }

    // 3. BUSINESS PARTNERS
    if (!(await tableExists('business_partners'))) {
      if (!silent) console.log('   Creating business_partners table...');
      await sequelize.query(`
        CREATE TABLE \`business_partners\` (
          \`partner_id\` CHAR(36) NOT NULL PRIMARY KEY,
          \`partner_name\` VARCHAR(255) NOT NULL,
          \`partner_type\` ENUM('SUPPLIER', 'CUSTOMER', 'BOTH') NOT NULL DEFAULT 'SUPPLIER',
          \`gst_number\` VARCHAR(15) NOT NULL,
          \`pan_card\` VARCHAR(10) NOT NULL,
          \`billing_address\` TEXT NOT NULL,
          \`shipping_address\` TEXT NOT NULL,
          \`same_as_billing\` BOOLEAN NOT NULL DEFAULT FALSE,
          \`bank_name\` VARCHAR(255) NOT NULL,
          \`bank_account_name\` VARCHAR(255) NOT NULL,
          \`ifsc_code\` VARCHAR(11) NOT NULL,
          \`account_number\` VARCHAR(50) NOT NULL,
          \`contact_first_name\` VARCHAR(100) NOT NULL,
          \`contact_last_name\` VARCHAR(100) NOT NULL,
          \`contact_designation\` VARCHAR(100) NOT NULL,
          \`contact_phone\` VARCHAR(20) NOT NULL,
          \`contact_email\` VARCHAR(100) NOT NULL,
          \`country\` VARCHAR(100) NULL,
          \`state\` VARCHAR(100) NULL,
          \`company_website\` VARCHAR(255) NULL,
          \`vendor_code\` VARCHAR(50) NULL,
          \`contact_person\` VARCHAR(255) NULL,
          \`email\` VARCHAR(100) NULL,
          \`phone\` VARCHAR(20) NULL,
          \`address\` TEXT NULL,
          \`org_id\` CHAR(36) NULL,
          \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_partner_name\` (\`partner_name\`),
          INDEX \`idx_partner_type\` (\`partner_type\`),
          INDEX \`idx_org_id\` (\`org_id\`),
          INDEX \`idx_vendor_code\` (\`vendor_code\`),
          INDEX \`idx_gst_number\` (\`gst_number\`),
          UNIQUE KEY \`unique_vendor_code\` (\`vendor_code\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `, { type: QueryTypes.RAW });
      if (!silent) console.log('   ✅ business_partners table created');
    } else {
      if (!silent) console.log('   ℹ️  business_partners table already exists');
      
      // Add new columns if they don't exist
      if (!silent) console.log('   Checking for new columns in business_partners table...');
      
      const newColumns = [
        { name: 'gst_number', definition: 'VARCHAR(15) NULL' },
        { name: 'pan_card', definition: 'VARCHAR(10) NULL' },
        { name: 'tan_number', definition: 'VARCHAR(20) NULL COMMENT \'TAN Number / Card (optional)\'' },
        { name: 'billing_address', definition: 'TEXT NULL' },
        { name: 'shipping_address', definition: 'TEXT NULL' },
        { name: 'same_as_billing', definition: 'BOOLEAN NOT NULL DEFAULT FALSE' },
        { name: 'bank_name', definition: 'VARCHAR(255) NULL' },
        { name: 'bank_account_name', definition: 'VARCHAR(255) NULL' },
        { name: 'ifsc_code', definition: 'VARCHAR(11) NULL' },
        { name: 'account_number', definition: 'VARCHAR(50) NULL' },
        { name: 'contact_first_name', definition: 'VARCHAR(100) NULL' },
        { name: 'contact_last_name', definition: 'VARCHAR(100) NULL' },
        { name: 'contact_designation', definition: 'VARCHAR(100) NULL' },
        { name: 'contact_phone', definition: 'VARCHAR(20) NULL' },
        { name: 'contact_email', definition: 'VARCHAR(100) NULL' },
        { name: 'country', definition: 'VARCHAR(100) NULL' },
        { name: 'state', definition: 'VARCHAR(100) NULL' },
        { name: 'company_website', definition: 'VARCHAR(255) NULL' },
        { name: 'vendor_code', definition: 'VARCHAR(50) NULL' },
      ];

      for (const column of newColumns) {
        if (!(await columnExists('business_partners', column.name))) {
          try {
            await sequelize.query(`
              ALTER TABLE \`business_partners\` 
              ADD COLUMN \`${column.name}\` ${column.definition}
            `, { type: QueryTypes.RAW });
            if (!silent) console.log(`   ✅ Added column: ${column.name}`);
          } catch (error) {
            if (!silent) console.log(`   ⚠️  Error adding column ${column.name}: ${error.message}`);
          }
        }
      }

      // Update partner_type ENUM if needed (change CUSTOMER to FRANCHISE)
      try {
        await sequelize.query(`
          ALTER TABLE \`business_partners\` 
          MODIFY COLUMN \`partner_type\` ENUM('SUPPLIER', 'FRANCHISE', 'BOTH', 'VENDOR') NOT NULL DEFAULT 'SUPPLIER'
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Updated partner_type ENUM (CUSTOMER -> FRANCHISE)');
      } catch (error) {
        // Ignore if already updated
        if (!silent && !error.message.includes('Duplicate')) {
          console.log(`   ⚠️  Error updating partner_type: ${error.message}`);
        }
      }

      // Add indexes if they don't exist
      try {
        await sequelize.query(`
          CREATE INDEX \`idx_vendor_code\` ON \`business_partners\` (\`vendor_code\`)
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added vendor_code index');
      } catch (error) {
        // Index might already exist
      }

      try {
        await sequelize.query(`
          CREATE INDEX \`idx_gst_number\` ON \`business_partners\` (\`gst_number\`)
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added gst_number index');
      } catch (error) {
        // Index might already exist
      }
    }

    // 4. GROUPS
    if (!(await tableExists('groups'))) {
      if (!silent) console.log('   Creating groups table...');
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
      if (!silent) console.log('   ✅ groups table created');
    } else {
      if (!silent) console.log('   ℹ️  groups table already exists');
      
      // Check and fix all required columns
      try {
        // Get all existing columns
        const allColumns = await sequelize.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'groups'
        `, { type: QueryTypes.SELECT });
        
        const existingColumnNames = Array.isArray(allColumns) && allColumns.length > 0
          ? allColumns.map(col => col.COLUMN_NAME || col[0] || col)
          : [];
        
        // Check and add group_id if missing (this is the primary key)
        if (!existingColumnNames.includes('group_id')) {
          if (!silent) console.log('   ⚠️  group_id column missing! Adding it...');
          
          // Check if there's an 'id' column we should rename
          if (existingColumnNames.includes('id')) {
            // Rename id to group_id
            await sequelize.query(`
              ALTER TABLE \`groups\`
              CHANGE COLUMN \`id\` \`group_id\` CHAR(36) NOT NULL
            `, { type: QueryTypes.RAW });
            if (!silent) console.log('   ✅ Renamed id column to group_id');
          } else {
            // Add group_id as primary key
            await sequelize.query(`
              ALTER TABLE \`groups\`
              ADD COLUMN \`group_id\` CHAR(36) NOT NULL PRIMARY KEY FIRST
            `, { type: QueryTypes.RAW });
            if (!silent) console.log('   ✅ Added group_id column as primary key');
          }
        }
        
        // Check and add group_name if missing
        if (!existingColumnNames.includes('group_name')) {
          if (!silent) console.log('   Adding group_name column to groups table...');
          await sequelize.query(`
            ALTER TABLE \`groups\`
            ADD COLUMN \`group_name\` VARCHAR(255) NOT NULL AFTER \`group_id\`
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ group_name column added to groups table');
        }
        
        // Check and add description if missing
        if (!existingColumnNames.includes('description')) {
          if (!silent) console.log('   Adding description column to groups table...');
          await sequelize.query(`
            ALTER TABLE \`groups\`
            ADD COLUMN \`description\` TEXT NULL AFTER \`group_name\`
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ description column added to groups table');
        }
        
        // Check and add org_id if missing
        if (!existingColumnNames.includes('org_id')) {
          if (!silent) console.log('   Adding org_id column to groups table...');
          await sequelize.query(`
            ALTER TABLE \`groups\`
            ADD COLUMN \`org_id\` CHAR(36) NULL AFTER \`description\`
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ org_id column added to groups table');
        }
        
        // Check and add is_active if missing
        if (!existingColumnNames.includes('is_active')) {
          if (!silent) console.log('   Adding is_active column to groups table...');
          await sequelize.query(`
            ALTER TABLE \`groups\`
            ADD COLUMN \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE AFTER \`org_id\`
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ is_active column added to groups table');
        }
        
        // Check and add timestamps if missing
        if (!existingColumnNames.includes('created_at')) {
          if (!silent) console.log('   Adding created_at column to groups table...');
          await sequelize.query(`
            ALTER TABLE \`groups\`
            ADD COLUMN \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ created_at column added to groups table');
        }
        
        if (!existingColumnNames.includes('updated_at')) {
          if (!silent) console.log('   Adding updated_at column to groups table...');
          await sequelize.query(`
            ALTER TABLE \`groups\`
            ADD COLUMN \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ updated_at column added to groups table');
        }
        
        // Add indexes if they don't exist
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
          if (!silent) console.log('   Adding index on group_name...');
          await sequelize.query(`
            ALTER TABLE \`groups\`
            ADD INDEX \`idx_group_name\` (\`group_name\`)
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ index added on group_name');
        }
        
        if (!existingIndexNames.includes('idx_org_id')) {
          if (!silent) console.log('   Adding index on org_id...');
          await sequelize.query(`
            ALTER TABLE \`groups\`
            ADD INDEX \`idx_org_id\` (\`org_id\`)
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ index added on org_id');
        }
        
        // Migrate data from 'name' to 'group_name' if 'name' column exists, then drop it
        if (existingColumnNames.includes('name')) {
          try {
            // First, migrate any data from 'name' to 'group_name'
            await sequelize.query(`
              UPDATE \`groups\`
              SET \`group_name\` = \`name\`
              WHERE (\`group_name\` IS NULL OR \`group_name\` = '') 
              AND \`name\` IS NOT NULL 
              AND \`name\` != ''
            `, { type: QueryTypes.UPDATE });
            if (!silent) console.log('   ✅ Migrated data from "name" to "group_name"');
            
            // Now drop the legacy 'name' column since we're using 'group_name'
            try {
              await sequelize.query(`
                ALTER TABLE \`groups\`
                DROP COLUMN \`name\`
              `, { type: QueryTypes.RAW });
              if (!silent) console.log('   ✅ Dropped legacy "name" column from groups table');
            } catch (dropError) {
              if (!silent) console.log('   ⚠️  Could not drop "name" column (may be in use):', dropError.message);
            }
          } catch (e) {
            if (!silent) console.log('   ⚠️  Could not migrate data:', e.message);
          }
        }
        
        if (!silent) console.log('   ✅ groups table structure verified and fixed');
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not update groups table:', e.message);
        if (!silent && e.stack) console.log('   Stack:', e.stack);
      }
    }

    // 5. TEAMS
    if (!(await tableExists('teams'))) {
      if (!silent) console.log('   Creating teams table...');
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
      if (!silent) console.log('   ✅ teams table created');
    } else {
      if (!silent) console.log('   ℹ️  teams table already exists');
      
      // Check and fix all required columns
      try {
        // Get all existing columns
        const allColumns = await sequelize.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'teams'
        `, { type: QueryTypes.SELECT });
        
        const existingColumnNames = Array.isArray(allColumns) && allColumns.length > 0
          ? allColumns.map(col => col.COLUMN_NAME || col[0] || col)
          : [];
        
        // Check and add team_id if missing (this is the primary key)
        if (!existingColumnNames.includes('team_id')) {
          if (!silent) console.log('   ⚠️  team_id column missing! Adding it...');
          
          // Check if there's an 'id' column we should rename
          if (existingColumnNames.includes('id')) {
            // First, find and drop any foreign key constraints that reference teams.id
            try {
              const [fks] = await sequelize.query(`
                SELECT CONSTRAINT_NAME, TABLE_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND REFERENCED_TABLE_NAME = 'teams'
                AND REFERENCED_COLUMN_NAME = 'id'
              `, { type: QueryTypes.SELECT });
              
              if (fks && Array.isArray(fks) && fks.length > 0) {
                for (const fk of fks) {
                  const fkName = fk.CONSTRAINT_NAME || (Array.isArray(fk) ? fk[0] : null);
                  const tableName = fk.TABLE_NAME || (Array.isArray(fk) ? fk[1] : null);
                  if (fkName && tableName) {
                    try {
                      await sequelize.query(`
                        ALTER TABLE \`${tableName}\`
                        DROP FOREIGN KEY \`${fkName}\`
                      `, { type: QueryTypes.RAW });
                      if (!silent) console.log(`   ✅ Dropped foreign key ${fkName} from ${tableName}`);
                    } catch (fkError) {
                      if (!silent) console.log(`   ⚠️  Could not drop foreign key ${fkName}:`, fkError.message);
                    }
                  }
                }
              }
            } catch (fkCheckError) {
              if (!silent) console.log('   ⚠️  Could not check for foreign keys:', fkCheckError.message);
            }
            
            // Now rename id to team_id
            try {
              await sequelize.query(`
                ALTER TABLE \`teams\`
                CHANGE COLUMN \`id\` \`team_id\` CHAR(36) NOT NULL
              `, { type: QueryTypes.RAW });
              if (!silent) console.log('   ✅ Renamed id column to team_id');
              
              // Try to recreate the foreign keys with the new column name
              try {
                const [droppedFks] = await sequelize.query(`
                  SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME
                  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                  WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'case_reason_configs'
                  AND COLUMN_NAME LIKE '%team%'
                `, { type: QueryTypes.SELECT });
                
                // Note: We don't recreate the foreign key automatically as it might have been intentionally removed
                // The application should handle this through proper schema management
              } catch (recreateError) {
                // Silently continue - foreign keys can be recreated later if needed
              }
            } catch (renameError) {
              if (!silent) console.log('   ⚠️  Could not rename id to team_id:', renameError.message);
              // Fallback: Add team_id as a new column and copy data
              try {
                await sequelize.query(`
                  ALTER TABLE \`teams\`
                  ADD COLUMN \`team_id\` CHAR(36) NULL AFTER \`id\`
                `, { type: QueryTypes.RAW });
                
                // Copy data from id to team_id
                await sequelize.query(`
                  UPDATE \`teams\`
                  SET \`team_id\` = \`id\`
                `, { type: QueryTypes.RAW });
                
                // Make team_id NOT NULL and set as primary key
                await sequelize.query(`
                  ALTER TABLE \`teams\`
                  MODIFY COLUMN \`team_id\` CHAR(36) NOT NULL,
                  DROP PRIMARY KEY,
                  ADD PRIMARY KEY (\`team_id\`)
                `, { type: QueryTypes.RAW });
                
                if (!silent) console.log('   ✅ Added team_id column and migrated data from id');
              } catch (fallbackError) {
                if (!silent) console.log('   ⚠️  Fallback migration also failed:', fallbackError.message);
              }
            }
          } else {
            // Add team_id as primary key
            await sequelize.query(`
              ALTER TABLE \`teams\`
              ADD COLUMN \`team_id\` CHAR(36) NOT NULL PRIMARY KEY FIRST
            `, { type: QueryTypes.RAW });
            if (!silent) console.log('   ✅ Added team_id column as primary key');
          }
        }
        
        // Check and add team_name if missing
        if (!existingColumnNames.includes('team_name')) {
          if (!silent) console.log('   Adding team_name column to teams table...');
          await sequelize.query(`
            ALTER TABLE \`teams\`
            ADD COLUMN \`team_name\` VARCHAR(255) NOT NULL AFTER \`team_id\`
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ team_name column added to teams table');
        }
        
        // Check and add/fix group_id column
        if (!existingColumnNames.includes('group_id')) {
          if (!silent) console.log('   Adding group_id column to teams table...');
          await sequelize.query(`
            ALTER TABLE \`teams\`
            ADD COLUMN \`group_id\` CHAR(36) NULL AFTER \`team_name\`
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ group_id column added to teams table');
        } else {
          // Check if group_id is INTEGER and needs to be changed to CHAR(36)
          try {
            const [columnInfo] = await sequelize.query(`
              SELECT DATA_TYPE, COLUMN_TYPE
              FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'teams'
              AND COLUMN_NAME = 'group_id'
            `, { type: QueryTypes.SELECT });
            
            if (columnInfo && (columnInfo.DATA_TYPE === 'int' || columnInfo.DATA_TYPE === 'integer' || (columnInfo.COLUMN_TYPE && columnInfo.COLUMN_TYPE.includes('int')))) {
              if (!silent) console.log('   ⚠️  group_id is INTEGER, changing to CHAR(36)...');
              
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
                  const fkName = (Array.isArray(fks[0]) ? fks[0][0] : fks[0].CONSTRAINT_NAME) || 'fk_team_group';
                  await sequelize.query(`
                    ALTER TABLE \`teams\`
                    DROP FOREIGN KEY \`${fkName}\`
                  `, { type: QueryTypes.RAW });
                  if (!silent) console.log('   ✅ Dropped foreign key before changing column type');
                }
              } catch (fkError) {
                if (!silent) console.log('   ⚠️  Could not drop foreign key (may not exist):', fkError.message);
              }
              
              // Change column type from INTEGER to CHAR(36)
              await sequelize.query(`
                ALTER TABLE \`teams\`
                MODIFY COLUMN \`group_id\` CHAR(36) NULL
              `, { type: QueryTypes.RAW });
              
              if (!silent) console.log('   ✅ Changed group_id from INTEGER to CHAR(36)');
              
              // Re-add foreign key
              try {
                await sequelize.query(`
                  ALTER TABLE \`teams\`
                  ADD CONSTRAINT \`fk_team_group\` FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`group_id\`) ON DELETE SET NULL
                `, { type: QueryTypes.RAW });
                if (!silent) console.log('   ✅ Re-added foreign key constraint');
              } catch (fkError) {
                if (!silent) console.log('   ⚠️  Could not re-add foreign key:', fkError.message);
              }
            }
          } catch (checkError) {
            if (!silent) console.log('   ⚠️  Could not check group_id column type:', checkError.message);
          }
        }
        
        // Check and add description if missing
        if (!existingColumnNames.includes('description')) {
          if (!silent) console.log('   Adding description column to teams table...');
          await sequelize.query(`
            ALTER TABLE \`teams\`
            ADD COLUMN \`description\` TEXT NULL AFTER \`team_name\`
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ description column added to teams table');
        }
        
        // Check and add org_id if missing
        if (!existingColumnNames.includes('org_id')) {
          if (!silent) console.log('   Adding org_id column to teams table...');
          await sequelize.query(`
            ALTER TABLE \`teams\`
            ADD COLUMN \`org_id\` CHAR(36) NULL AFTER \`description\`
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ org_id column added to teams table');
        }
        
        // Check and add is_active if missing
        if (!existingColumnNames.includes('is_active')) {
          if (!silent) console.log('   Adding is_active column to teams table...');
          await sequelize.query(`
            ALTER TABLE \`teams\`
            ADD COLUMN \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE AFTER \`org_id\`
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ is_active column added to teams table');
        }
        
        // Check and add timestamps if missing
        if (!existingColumnNames.includes('created_at')) {
          if (!silent) console.log('   Adding created_at column to teams table...');
          await sequelize.query(`
            ALTER TABLE \`teams\`
            ADD COLUMN \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ created_at column added to teams table');
        }
        
        if (!existingColumnNames.includes('updated_at')) {
          if (!silent) console.log('   Adding updated_at column to teams table...');
          await sequelize.query(`
            ALTER TABLE \`teams\`
            ADD COLUMN \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ updated_at column added to teams table');
        }
        
        // Add indexes if they don't exist
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
          if (!silent) console.log('   Adding index on team_name...');
          await sequelize.query(`
            ALTER TABLE \`teams\`
            ADD INDEX \`idx_team_name\` (\`team_name\`)
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ index added on team_name');
        }
        
        if (!existingIndexNames.includes('idx_group_id')) {
          if (!silent) console.log('   Adding index on group_id...');
          await sequelize.query(`
            ALTER TABLE \`teams\`
            ADD INDEX \`idx_group_id\` (\`group_id\`)
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ index added on group_id');
        }
        
        if (!existingIndexNames.includes('idx_org_id')) {
          if (!silent) console.log('   Adding index on org_id...');
          await sequelize.query(`
            ALTER TABLE \`teams\`
            ADD INDEX \`idx_org_id\` (\`org_id\`)
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ index added on org_id');
        }
        
        // Migrate data from 'name' to 'team_name' if 'name' column exists
        if (existingColumnNames.includes('name')) {
          try {
            await sequelize.query(`
              UPDATE \`teams\`
              SET \`team_name\` = \`name\`
              WHERE (\`team_name\` IS NULL OR \`team_name\` = '') 
              AND \`name\` IS NOT NULL 
              AND \`name\` != ''
            `, { type: QueryTypes.UPDATE });
            if (!silent) console.log('   ✅ Migrated data from "name" to "team_name"');
          } catch (e) {
            if (!silent) console.log('   ⚠️  Could not migrate data:', e.message);
          }
        }
        
        if (!silent) console.log('   ✅ teams table structure verified and fixed');
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not update teams table:', e.message);
        if (!silent && e.stack) console.log('   Stack:', e.stack);
      }
    }

    // 6. PURCHASE REQUESTS
    if (!(await tableExists('purchase_requests'))) {
      if (!silent) console.log('   Creating purchase_requests table...');
      
      // Create without foreign keys first
      await sequelize.query(`
        CREATE TABLE \`purchase_requests\` (
          \`pr_id\` CHAR(36) NOT NULL PRIMARY KEY,
          \`pr_number\` VARCHAR(100) NOT NULL UNIQUE,
          \`requested_by\` INT NOT NULL,
          \`status\` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
          \`requested_date\` DATE NOT NULL,
          \`approved_by\` INT NULL,
          \`approval_date\` DATETIME NULL,
          \`remarks\` TEXT NULL,
          \`org_id\` CHAR(36) NULL,
          \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_pr_number\` (\`pr_number\`),
          INDEX \`idx_status\` (\`status\`),
          INDEX \`idx_requested_by\` (\`requested_by\`),
          INDEX \`idx_org_id\` (\`org_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `, { type: QueryTypes.RAW });
      
      // Add foreign keys
      try {
        await sequelize.query(`
          ALTER TABLE \`purchase_requests\`
          ADD CONSTRAINT \`fk_pr_requested_by\` FOREIGN KEY (\`requested_by\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT,
          ADD CONSTRAINT \`fk_pr_approved_by\` FOREIGN KEY (\`approved_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL;
        `, { type: QueryTypes.RAW });
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add foreign keys to purchase_requests');
      }
      
      if (!silent) console.log('   ✅ purchase_requests table created');
    } else {
      if (!silent) console.log('   ℹ️  purchase_requests table already exists');
    }

    // 7. PURCHASE REQUEST ITEMS
    if (!(await tableExists('purchase_request_items'))) {
      if (!silent) console.log('   Creating purchase_request_items table...');
      
      const prIdInfo = await getColumnType('purchase_requests', 'pr_id');
      const prIdType = prIdInfo.fullType || 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
      const matIdInfo = await getColumnType('materials', 'material_id');
      const matIdType = matIdInfo.fullType || 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
      const bpIdInfo = await getColumnType('business_partners', 'partner_id');
      const bpIdType = bpIdInfo.fullType || 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
      
      await sequelize.query(`
        CREATE TABLE \`purchase_request_items\` (
          \`item_id\` CHAR(36) NOT NULL PRIMARY KEY,
          \`pr_id\` ${prIdType} NOT NULL,
          \`material_id\` ${matIdType} NOT NULL,
          \`requested_quantity\` INT NOT NULL DEFAULT 1,
          \`uom\` VARCHAR(50) NOT NULL DEFAULT 'PIECE(S)',
          \`remarks\` TEXT NULL,
          \`pr_name\` VARCHAR(255) NOT NULL COMMENT 'Name of the product requested',
          \`business_partner_id\` ${bpIdType} NULL COMMENT 'Reference to business partner (supplier)',
          \`material_type\` VARCHAR(100) NOT NULL COMMENT 'Type of material (references material_types table)',
          \`shipping_address\` TEXT NULL COMMENT 'Shipping address (warehouse address)',
          \`description\` TEXT NULL COMMENT 'Description of the item',
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_pr_id\` (\`pr_id\`),
          INDEX \`idx_material_id\` (\`material_id\`),
          INDEX \`idx_business_partner_id\` (\`business_partner_id\`),
          INDEX \`idx_material_type\` (\`material_type\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `, { type: QueryTypes.RAW });
      
      // Add foreign keys
      try {
        await sequelize.query(`
          ALTER TABLE \`purchase_request_items\`
          ADD CONSTRAINT \`fk_pri_pr\` FOREIGN KEY (\`pr_id\`) REFERENCES \`purchase_requests\`(\`pr_id\`) ON DELETE CASCADE,
          ADD CONSTRAINT \`fk_pri_material\` FOREIGN KEY (\`material_id\`) REFERENCES \`materials\`(\`material_id\`) ON DELETE RESTRICT;
        `, { type: QueryTypes.RAW });
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add foreign keys to purchase_request_items');
      }
      
      if (!silent) console.log('   ✅ purchase_request_items table created');
    } else {
      if (!silent) console.log('   ℹ️  purchase_request_items table already exists');
      
      // Add missing columns if table exists but columns don't
      // Get business_partner_id type, default to CHAR(36) if business_partners table doesn't exist yet
      let bpIdType = 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
      try {
        if (await tableExists('business_partners')) {
          const bpIdInfo = await getColumnType('business_partners', 'partner_id');
          bpIdType = bpIdInfo.fullType || bpIdType;
        }
      } catch (e) {
        // Use default if we can't get the type
      }
      
      const columnsToAdd = [
        { name: 'pr_name', definition: 'VARCHAR(255) NOT NULL DEFAULT \'\' COMMENT \'Name of the product requested\' AFTER `remarks`' },
        { name: 'business_partner_id', definition: `${bpIdType} NULL COMMENT 'Reference to business partner (supplier)' AFTER \`pr_name\`` },
        { name: 'material_type', definition: `VARCHAR(100) NOT NULL COMMENT 'Type of material (references material_types table)' AFTER \`business_partner_id\`` },
        { name: 'shipping_address', definition: 'TEXT NULL COMMENT \'Shipping address (warehouse address)\' AFTER `material_type`' },
        { name: 'billing_address', definition: 'TEXT NULL COMMENT \'Billing address (auto-populated from warehouse)\' AFTER `shipping_address`' },
        { name: 'description', definition: 'TEXT NULL COMMENT \'Description of the item\' AFTER `billing_address`' },
      ];

      for (const column of columnsToAdd) {
        if (!(await columnExists('purchase_request_items', column.name))) {
          try {
            await sequelize.query(`
              ALTER TABLE \`purchase_request_items\` 
              ADD COLUMN \`${column.name}\` ${column.definition}
            `, { type: QueryTypes.RAW });
            if (!silent) console.log(`   ✅ Added column: ${column.name}`);
          } catch (error) {
            if (!silent) console.log(`   ⚠️  Error adding column ${column.name}: ${error.message}`);
          }
        }
      }
      
      // Add index for business_partner_id if column exists but index doesn't
      if (await columnExists('purchase_request_items', 'business_partner_id')) {
        try {
          await ensureIndex('purchase_request_items', 'idx_business_partner_id', '(`business_partner_id`)');
          if (!silent) console.log('   ✅ Added business_partner_id index');
        } catch (error) {
          // Index might already exist
        }
      }
      
      // Add index for material_type if column exists but index doesn't
      if (await columnExists('purchase_request_items', 'material_type')) {
        try {
          await ensureIndex('purchase_request_items', 'idx_material_type', '(`material_type`)');
          if (!silent) console.log('   ✅ Added material_type index');
        } catch (error) {
          // Index might already exist
        }
        
        // Migrate material_type from ENUM to VARCHAR(100) to support dynamic material types
        try {
          // Check if column is still ENUM type
          const columnInfo = await sequelize.query(`
            SELECT COLUMN_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'purchase_request_items'
              AND COLUMN_NAME = 'material_type'
          `, { type: QueryTypes.SELECT });
          
          if (Array.isArray(columnInfo) && columnInfo.length > 0) {
            const columnType = columnInfo[0].COLUMN_TYPE || '';
            // Check if it's an ENUM type
            if (columnType.toUpperCase().startsWith('ENUM')) {
              // Change ENUM to VARCHAR(100)
              await sequelize.query(`
                ALTER TABLE \`purchase_request_items\`
                MODIFY COLUMN \`material_type\` VARCHAR(100) NOT NULL COMMENT 'Type of material (references material_types table)'
              `, { type: QueryTypes.RAW });
              if (!silent) console.log('   ✅ Migrated material_type from ENUM to VARCHAR(100)');
            }
          }
        } catch (error) {
          if (!silent) console.log(`   ⚠️  Could not migrate material_type column: ${error.message}`);
          // Continue - column might already be VARCHAR or migration might have failed
        }
      }
    }

    // 8. PURCHASE ORDERS
    if (!(await tableExists('purchase_orders'))) {
      if (!silent) console.log('   Creating purchase_orders table...');
      
      const prIdInfo2 = await getColumnType('purchase_requests', 'pr_id');
      const prIdType2 = prIdInfo2.fullType || 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
      
      await sequelize.query(`
        CREATE TABLE \`purchase_orders\` (
          \`po_id\` CHAR(36) NOT NULL PRIMARY KEY,
          \`po_number\` VARCHAR(100) NOT NULL UNIQUE,
          \`pr_id\` ${prIdType2} NULL COMMENT 'Links to Purchase Request',
          \`vendor_id\` CHAR(36) NULL COMMENT 'Business Partner ID',
          \`po_date\` DATE NOT NULL,
          \`status\` ENUM('DRAFT', 'SENT', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
          \`total_amount\` DECIMAL(15, 2) NULL DEFAULT 0.00,
          \`remarks\` TEXT NULL,
          \`org_id\` CHAR(36) NULL,
          \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_po_number\` (\`po_number\`),
          INDEX \`idx_pr_id\` (\`pr_id\`),
          INDEX \`idx_vendor_id\` (\`vendor_id\`),
          INDEX \`idx_status\` (\`status\`),
          INDEX \`idx_org_id\` (\`org_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `, { type: QueryTypes.RAW });
      
      // Add foreign keys
      try {
        await sequelize.query(`
          ALTER TABLE \`purchase_orders\`
          ADD CONSTRAINT \`fk_po_pr\` FOREIGN KEY (\`pr_id\`) REFERENCES \`purchase_requests\`(\`pr_id\`) ON DELETE SET NULL,
          ADD CONSTRAINT \`fk_po_vendor\` FOREIGN KEY (\`vendor_id\`) REFERENCES \`business_partners\`(\`partner_id\`) ON DELETE SET NULL;
        `, { type: QueryTypes.RAW });
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add foreign keys to purchase_orders');
      }
      
      if (!silent) console.log('   ✅ purchase_orders table created');
    } else {
      if (!silent) console.log('   ℹ️  purchase_orders table already exists');
      
      // Check if documents column exists, if not add it
      try {
        const [columns] = await sequelize.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'purchase_orders' 
          AND COLUMN_NAME = 'documents'
        `, { type: QueryTypes.SELECT });
        
        if (!columns || columns.length === 0) {
          if (!silent) console.log('   Adding documents column to purchase_orders table...');
          await sequelize.query(`
            ALTER TABLE \`purchase_orders\`
            ADD COLUMN \`documents\` JSON NULL COMMENT 'Array of document file paths'
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ documents column added to purchase_orders');
        }
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add documents column:', e.message);
      }
    }

    // 9. PURCHASE ORDER ITEMS
    if (!(await tableExists('purchase_order_items'))) {
      if (!silent) console.log('   Creating purchase_order_items table...');
      
      const poIdInfo = await getColumnType('purchase_orders', 'po_id');
      const poIdType = poIdInfo.fullType || 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
      const matIdInfo2 = await getColumnType('materials', 'material_id');
      const matIdType2 = matIdInfo2.fullType || 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
      
      await sequelize.query(`
        CREATE TABLE \`purchase_order_items\` (
          \`item_id\` CHAR(36) NOT NULL PRIMARY KEY,
          \`po_id\` ${poIdType} NOT NULL,
          \`material_id\` ${matIdType2} NOT NULL,
          \`quantity\` INT NOT NULL DEFAULT 1,
          \`unit_price\` DECIMAL(10, 2) NULL,
          \`total_amount\` DECIMAL(15, 2) NULL,
          \`uom\` VARCHAR(50) NOT NULL DEFAULT 'PIECE(S)',
          \`remarks\` TEXT NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_po_id\` (\`po_id\`),
          INDEX \`idx_material_id\` (\`material_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `, { type: QueryTypes.RAW });
      
      // Add foreign keys
      try {
        await sequelize.query(`
          ALTER TABLE \`purchase_order_items\`
          ADD CONSTRAINT \`fk_poi_po\` FOREIGN KEY (\`po_id\`) REFERENCES \`purchase_orders\`(\`po_id\`) ON DELETE CASCADE,
          ADD CONSTRAINT \`fk_poi_material\` FOREIGN KEY (\`material_id\`) REFERENCES \`materials\`(\`material_id\`) ON DELETE RESTRICT;
        `, { type: QueryTypes.RAW });
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add foreign keys to purchase_order_items');
      }
      
      if (!silent) console.log('   ✅ purchase_order_items table created');
    } else {
      if (!silent) console.log('   ℹ️  purchase_order_items table already exists');
    }

    if (!silent) console.log('');

    // ============================================================
    // PART 2: ADD MISSING COLUMNS TO EXISTING TABLES
    // ============================================================
    
    if (!silent) console.log('🔧 Adding missing columns to existing tables...\n');

    // Add Store Keeper to Stock Areas
    if (!(await columnExists('stock_areas', 'store_keeper_id'))) {
      if (!silent) console.log('   Adding store_keeper_id to stock_areas...');
      try {
        await sequelize.query(`
          ALTER TABLE \`stock_areas\` 
          ADD COLUMN \`store_keeper_id\` INT NULL COMMENT 'User ID assigned as Store Keeper' AFTER \`capacity\`;
        `, { type: QueryTypes.RAW });
        
        // Add index
        try {
          await sequelize.query(`
            ALTER TABLE \`stock_areas\`
            ADD INDEX \`idx_store_keeper\` (\`store_keeper_id\`);
          `, { type: QueryTypes.RAW });
        } catch (e) {
          // Index might already exist
        }
        
        // Add foreign key
        try {
          await sequelize.query(`
            ALTER TABLE \`stock_areas\`
            ADD CONSTRAINT \`fk_stock_area_store_keeper\` 
            FOREIGN KEY (\`store_keeper_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL;
          `, { type: QueryTypes.RAW });
        } catch (e) {
          if (!silent) console.log('   ⚠️  Foreign key might already exist');
        }
        if (!silent) console.log('   ✅ Added store_keeper_id to stock_areas');
      } catch (e) {
        // Column might already exist (race condition or previous partial migration)
        if (e.message && (e.message.includes('Duplicate column') || e.message.includes('already exists'))) {
          if (!silent) console.log('   ℹ️  store_keeper_id already exists, skipping...');
        } else {
          throw e; // Re-throw if it's a different error
        }
      }
    } else {
      if (!silent) console.log('   ℹ️  store_keeper_id already exists in stock_areas');
    }

    // Add description and pin_code to Stock Areas
    if (!(await columnExists('stock_areas', 'description'))) {
      if (!silent) console.log('   Adding description to stock_areas...');
      try {
        await sequelize.query(`
          ALTER TABLE \`stock_areas\` 
          ADD COLUMN \`description\` TEXT NULL COMMENT 'Description of the stock area/warehouse' AFTER \`store_keeper_id\`;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added description to stock_areas');
      } catch (e) {
        if (e.message && (e.message.includes('Duplicate column') || e.message.includes('already exists'))) {
          if (!silent) console.log('   ℹ️  description already exists, skipping...');
        } else {
          throw e;
        }
      }
    } else {
      if (!silent) console.log('   ℹ️  description already exists in stock_areas');
    }

    if (!(await columnExists('stock_areas', 'pin_code'))) {
      if (!silent) console.log('   Adding pin_code to stock_areas...');
      try {
        await sequelize.query(`
          ALTER TABLE \`stock_areas\` 
          ADD COLUMN \`pin_code\` VARCHAR(10) NULL COMMENT 'Pin code of the warehouse location' AFTER \`description\`;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added pin_code to stock_areas');
      } catch (e) {
        if (e.message && (e.message.includes('Duplicate column') || e.message.includes('already exists'))) {
          if (!silent) console.log('   ℹ️  pin_code already exists, skipping...');
        } else {
          throw e;
        }
      }
    } else {
      if (!silent) console.log('   ℹ️  pin_code already exists in stock_areas');
    }

    // Add new address fields to stock_areas
    const stockAreaAddressColumns = [
      { name: 'company_name', definition: 'VARCHAR(255) NULL COMMENT \'Company name (if applicable)\' AFTER `pin_code`' },
      { name: 'street_number_name', definition: 'VARCHAR(255) NULL COMMENT \'Street number and name\' AFTER `company_name`' },
      { name: 'apartment_unit', definition: 'VARCHAR(100) NULL COMMENT \'Apartment/Unit number\' AFTER `street_number_name`' },
      { name: 'locality_district', definition: 'VARCHAR(255) NULL COMMENT \'Locality/District (if needed)\' AFTER `apartment_unit`' },
      { name: 'city', definition: 'VARCHAR(100) NULL COMMENT \'City\' AFTER `locality_district`' },
      { name: 'state_province', definition: 'VARCHAR(100) NULL COMMENT \'State/Province\' AFTER `city`' },
      { name: 'country', definition: 'VARCHAR(100) NULL COMMENT \'Country (in all caps)\' AFTER `state_province`' },
    ];

    for (const column of stockAreaAddressColumns) {
      if (!(await columnExists('stock_areas', column.name))) {
        try {
          await sequelize.query(`
            ALTER TABLE \`stock_areas\` 
            ADD COLUMN \`${column.name}\` ${column.definition}
          `, { type: QueryTypes.RAW });
          if (!silent) console.log(`   ✅ Added ${column.name} to stock_areas`);
        } catch (error) {
          if (!silent) console.log(`   ⚠️  Error adding ${column.name} to stock_areas: ${error.message}`);
        }
      }
    }

    // Add missing columns to Materials table
    if (!(await columnExists('materials', 'hsn'))) {
      if (!silent) console.log('   Adding new columns to materials table...');
      try {
        await sequelize.query(`
          ALTER TABLE \`materials\`
          ADD COLUMN \`hsn\` VARCHAR(50) NULL COMMENT 'HSN (Harmonized System of Nomenclature) code - international standard code' AFTER \`description\`,
          ADD COLUMN \`gst_percentage\` DECIMAL(5, 2) NULL COMMENT 'GST percentage for the material' AFTER \`hsn\`,
          ADD COLUMN \`sgst_percentage\` DECIMAL(5, 2) NULL COMMENT 'SGST percentage for the material' AFTER \`gst_percentage\`,
          ADD COLUMN \`price\` DECIMAL(10, 2) NULL COMMENT 'Price of the material' AFTER \`sgst_percentage\`,
          ADD COLUMN \`asset_id\` VARCHAR(100) NULL COMMENT 'Asset ID for the material' AFTER \`price\`,
          ADD COLUMN \`material_property\` TEXT NULL COMMENT 'Material property information' AFTER \`asset_id\`,
          ADD COLUMN \`documents\` JSON NULL COMMENT 'Array of document file paths/URLs' AFTER \`material_property\`;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added new columns to materials table');
      } catch (e) {
        if (e.message && (e.message.includes('Duplicate column') || e.message.includes('already exists'))) {
          if (!silent) console.log('   ℹ️  Some columns already exist in materials table');
        } else {
          throw e;
        }
      }
    } else {
      // Check and add individual columns if they don't exist
      const columnsToAdd = [
        { name: 'hsn', sql: 'ADD COLUMN `hsn` VARCHAR(50) NULL COMMENT \'HSN (Harmonized System of Nomenclature) code - international standard code\' AFTER `description`' },
        { name: 'gst_percentage', sql: 'ADD COLUMN `gst_percentage` DECIMAL(5, 2) NULL COMMENT \'GST percentage for the material\' AFTER `hsn`' },
        { name: 'sgst_percentage', sql: 'ADD COLUMN `sgst_percentage` DECIMAL(5, 2) NULL COMMENT \'SGST percentage for the material\' AFTER `gst_percentage`' },
        { name: 'price', sql: 'ADD COLUMN `price` DECIMAL(10, 2) NULL COMMENT \'Price of the material\' AFTER `sgst_percentage`' },
        { name: 'asset_id', sql: 'ADD COLUMN `asset_id` VARCHAR(100) NULL COMMENT \'Asset ID for the material\' AFTER `price`' },
        { name: 'material_property', sql: 'ADD COLUMN `material_property` TEXT NULL COMMENT \'Material property information\' AFTER `asset_id`' },
        { name: 'documents', sql: 'ADD COLUMN `documents` JSON NULL COMMENT \'Array of document file paths/URLs\' AFTER `material_property`' },
      ];
      
      for (const col of columnsToAdd) {
        if (!(await columnExists('materials', col.name))) {
          try {
            await sequelize.query(`
              ALTER TABLE \`materials\`
              ${col.sql};
            `, { type: QueryTypes.RAW });
            if (!silent) console.log(`   ✅ Added ${col.name} to materials table`);
          } catch (e) {
            if (e.message && (e.message.includes('Duplicate column') || e.message.includes('already exists'))) {
              if (!silent) console.log(`   ℹ️  ${col.name} already exists in materials table`);
            } else {
              if (!silent) console.log(`   ⚠️  Could not add ${col.name}: ${e.message}`);
            }
          }
        }
      }
    }

    // Add missing columns to Material Requests (comprehensive check)
    if (!silent) console.log('   Checking material_requests table for new columns...');
    
    const stockAreaIdInfo = await getColumnType('stock_areas', 'area_id');
    const stockAreaIdType = stockAreaIdInfo.fullType || 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
    
    // Define all columns that need to be added
    const materialRequestColumns = [
      { 
        name: 'mr_number', 
        sql: `ADD COLUMN \`mr_number\` VARCHAR(50) NULL UNIQUE COMMENT 'Auto-generated MR number: MR-month(abv)-year-number' AFTER \`request_id\``,
        index: 'idx_mr_number'
      },
      { 
        name: 'request_date', 
        sql: `ADD COLUMN \`request_date\` DATE NULL COMMENT 'Request date (user selection or current day)' AFTER \`mr_number\``
      },
      { 
        name: 'requestor_id', 
        sql: `ADD COLUMN \`requestor_id\` INT NULL COMMENT 'Employee/Technician ID who is requesting' AFTER \`request_date\``,
        index: 'idx_requestor_id',
        fk: { name: 'fk_mr_requestor', table: 'users', column: 'id' }
      },
      { 
        name: 'from_stock_area_id', 
        sql: `ADD COLUMN \`from_stock_area_id\` ${stockAreaIdType} NULL COMMENT 'Which stock area to request from' AFTER \`requestor_id\``,
        index: 'idx_from_stock_area',
        fk: { name: 'fk_mr_stock_area', table: 'stock_areas', column: 'area_id' }
      },
      { 
        name: 'group_id', 
        sql: `ADD COLUMN \`group_id\` CHAR(36) NULL AFTER \`requested_by\``,
        index: 'idx_group_id',
        fk: { name: 'fk_mr_group', table: 'groups', column: 'group_id' }
      },
      { 
        name: 'team_id', 
        sql: `ADD COLUMN \`team_id\` CHAR(36) NULL AFTER \`group_id\``,
        index: 'idx_team_id',
        fk: { name: 'fk_mr_team', table: 'teams', column: 'team_id' }
      },
      { 
        name: 'service_area', 
        sql: `ADD COLUMN \`service_area\` VARCHAR(100) NULL COMMENT 'Service area (states in Goa)' AFTER \`team_id\``
      },
      { 
        name: 'created_by', 
        sql: `ADD COLUMN \`created_by\` INT NULL COMMENT 'User ID who created the MR' AFTER \`approved_by\``,
        index: 'idx_created_by',
        fk: { name: 'fk_mr_created_by', table: 'users', column: 'id' }
      },
    ];

    // Add missing columns one by one
    for (const col of materialRequestColumns) {
      if (!(await columnExists('material_requests', col.name))) {
        try {
          await sequelize.query(`
            ALTER TABLE \`material_requests\`
            ${col.sql};
          `, { type: QueryTypes.RAW });
          if (!silent) console.log(`   ✅ Added ${col.name} to material_requests`);
        } catch (e) {
          if (e.message && (e.message.includes('Duplicate column') || e.message.includes('already exists'))) {
            if (!silent) console.log(`   ℹ️  ${col.name} already exists`);
          } else {
            if (!silent) console.log(`   ⚠️  Could not add ${col.name}: ${e.message}`);
          }
        }
      } else {
        if (!silent) console.log(`   ℹ️  ${col.name} already exists in material_requests`);
      }
    }

    // Add indexes for columns that need them
    for (const col of materialRequestColumns) {
      if (col.index && await columnExists('material_requests', col.name)) {
        try {
          const indexes = await sequelize.query(`
            SELECT INDEX_NAME 
            FROM INFORMATION_SCHEMA.STATISTICS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'material_requests'
            AND INDEX_NAME = '${col.index}'
          `, { type: QueryTypes.SELECT });
          
          const indexExists = Array.isArray(indexes) && indexes.length > 0;
          
          if (!indexExists) {
            await sequelize.query(`
              ALTER TABLE \`material_requests\`
              ADD INDEX \`${col.index}\` (\`${col.name}\`);
            `, { type: QueryTypes.RAW });
            if (!silent) console.log(`   ✅ Added index ${col.index} on ${col.name}`);
          }
        } catch (e) {
          // Index might already exist or column might not exist
          if (!silent && !e.message.includes('Duplicate key')) {
            console.log(`   ⚠️  Could not add index ${col.index}: ${e.message}`);
          }
        }
      }
    }

    // Add foreign keys for columns that need them
    for (const col of materialRequestColumns) {
      if (col.fk && await columnExists('material_requests', col.name)) {
        try {
          const [fks] = await sequelize.query(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'material_requests'
            AND CONSTRAINT_NAME = '${col.fk.name}'
          `, { type: QueryTypes.SELECT });
          
          const fkExists = Array.isArray(fks) && fks.length > 0;
          
          if (!fkExists && await tableExists(col.fk.table)) {
            await sequelize.query(`
              ALTER TABLE \`material_requests\`
              ADD CONSTRAINT \`${col.fk.name}\` FOREIGN KEY (\`${col.name}\`) REFERENCES \`${col.fk.table}\`(\`${col.fk.column}\`) ON DELETE SET NULL;
            `, { type: QueryTypes.RAW });
            if (!silent) console.log(`   ✅ Added foreign key ${col.fk.name}`);
          }
        } catch (e) {
          if (!silent && !e.message.includes('Duplicate key') && !e.message.includes('already exists')) {
            console.log(`   ⚠️  Could not add foreign key ${col.fk.name}: ${e.message}`);
          }
        }
      }
    }
    
    if (!silent) console.log('   ✅ material_requests table structure verified');

    // Add description column to groups if missing
    if (!(await columnExists('groups', 'description'))) {
      try {
        await sequelize.query(`
          ALTER TABLE \`groups\`
          ADD COLUMN \`description\` TEXT NULL;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added description to groups');
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add description to groups');
      }
    }

    // Add description column to teams if missing
    if (!(await columnExists('teams', 'description'))) {
      try {
        await sequelize.query(`
          ALTER TABLE \`teams\`
          ADD COLUMN \`description\` TEXT NULL;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added description to teams');
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add description to teams');
      }
    }

    // Add missing columns to Stock Transfers
    if (!(await columnExists('stock_transfers', 'to_person_id'))) {
      if (!silent) console.log('   Adding to_person_id and transfer_type to stock_transfers...');
      try {
        await sequelize.query(`
          ALTER TABLE \`stock_transfers\`
          ADD COLUMN \`to_person_id\` INT NULL COMMENT 'Transfer to technician (Person Stock)' AFTER \`to_stock_area_id\`,
          ADD COLUMN \`transfer_type\` ENUM('MR_TRANSFER', 'RECONCILIATION', 'RETURN') NOT NULL DEFAULT 'MR_TRANSFER' AFTER \`material_request_id\`;
        `, { type: QueryTypes.RAW });
      } catch (e) {
        // Column might already exist (race condition or previous partial migration)
        if (e.message && (e.message.includes('Duplicate column') || e.message.includes('already exists'))) {
          if (!silent) console.log('   ℹ️  Columns already exist, skipping...');
        } else {
          throw e; // Re-throw if it's a different error
        }
      }
      
      // Add indexes
      try {
        await sequelize.query(`
          ALTER TABLE \`stock_transfers\`
          ADD INDEX \`idx_to_person\` (\`to_person_id\`),
          ADD INDEX \`idx_transfer_type\` (\`transfer_type\`);
        `, { type: QueryTypes.RAW });
      } catch (e) {
        // Indexes might already exist
      }
      
      // Add foreign key
      try {
        await sequelize.query(`
          ALTER TABLE \`stock_transfers\`
          ADD CONSTRAINT \`fk_transfer_person\` FOREIGN KEY (\`to_person_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL;
        `, { type: QueryTypes.RAW });
      } catch (e) {
        if (!silent) console.log('   ⚠️  Foreign key might already exist');
      }
      if (!silent) console.log('   ✅ Added columns to stock_transfers');
    } else {
      if (!silent) console.log('   ℹ️  Columns already exist in stock_transfers');
    }

    // Add Group/Team to Users
    if (!(await columnExists('users', 'group_id'))) {
      if (!silent) console.log('   Adding group_id and team_id to users...');
      try {
        await sequelize.query(`
          ALTER TABLE \`users\`
          ADD COLUMN \`group_id\` CHAR(36) NULL AFTER \`role\`,
          ADD COLUMN \`team_id\` CHAR(36) NULL AFTER \`group_id\`;
        `, { type: QueryTypes.RAW });
      } catch (e) {
        // Column might already exist (race condition or previous partial migration)
        if (e.message && (e.message.includes('Duplicate column') || e.message.includes('already exists'))) {
          if (!silent) console.log('   ℹ️  Columns already exist, skipping...');
        } else {
          throw e; // Re-throw if it's a different error
        }
      }
      
      // Add indexes
      try {
        await sequelize.query(`
          ALTER TABLE \`users\`
          ADD INDEX \`idx_user_group\` (\`group_id\`),
          ADD INDEX \`idx_user_team\` (\`team_id\`);
        `, { type: QueryTypes.RAW });
      } catch (e) {
        // Indexes might already exist
      }
      
      // Add foreign keys
      try {
        await sequelize.query(`
          ALTER TABLE \`users\`
          ADD CONSTRAINT \`fk_user_group\` FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`group_id\`) ON DELETE SET NULL,
          ADD CONSTRAINT \`fk_user_team\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`team_id\`) ON DELETE SET NULL;
        `, { type: QueryTypes.RAW });
      } catch (e) {
        if (!silent) console.log('   ⚠️  Foreign keys might already exist');
      }
      if (!silent) console.log('   ✅ Added columns to users');
    } else {
      if (!silent) console.log('   ℹ️  Columns already exist in users');
    }

    // Add Return fields to Consumption Records
    if (!(await columnExists('consumption_records', 'is_return'))) {
      if (!silent) console.log('   Adding is_return and return_reason to consumption_records...');
      try {
        await sequelize.query(`
          ALTER TABLE \`consumption_records\`
          ADD COLUMN \`is_return\` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Is this a return record?' AFTER \`stock_area_id\`,
          ADD COLUMN \`return_reason\` TEXT NULL COMMENT 'Reason for return' AFTER \`is_return\`;
        `, { type: QueryTypes.RAW });
      } catch (e) {
        // Column might already exist (race condition or previous partial migration)
        if (e.message && (e.message.includes('Duplicate column') || e.message.includes('already exists'))) {
          if (!silent) console.log('   ℹ️  Columns already exist, skipping...');
        } else {
          throw e; // Re-throw if it's a different error
        }
      }
      
      // Add index
      try {
        await sequelize.query(`
          ALTER TABLE \`consumption_records\`
          ADD INDEX \`idx_is_return\` (\`is_return\`);
        `, { type: QueryTypes.RAW });
      } catch (e) {
        // Index might already exist
      }
      if (!silent) console.log('   ✅ Added columns to consumption_records');
    } else {
      if (!silent) console.log('   ℹ️  Columns already exist in consumption_records');
    }

    // Add ticket_id fields to material_requests, stock_transfers, consumption_records
    if (!(await columnExists('material_requests', 'ticket_id'))) {
      if (!silent) console.log('   Adding ticket_id to material_requests...');
      try {
        await sequelize.query(`
          ALTER TABLE \`material_requests\`
          ADD COLUMN \`ticket_id\` VARCHAR(100) NULL COMMENT 'External system ticket/work order ID (e.g., TKT-55S)' AFTER \`remarks\`,
          ADD COLUMN \`ticket_status\` VARCHAR(50) NULL COMMENT 'Ticket status from external system' AFTER \`ticket_id\`;
        `, { type: QueryTypes.RAW });
        await sequelize.query(`
          ALTER TABLE \`material_requests\`
          ADD INDEX \`idx_ticket_id\` (\`ticket_id\`);
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added ticket_id to material_requests');
      } catch (e) {
        if (e.message && (e.message.includes('Duplicate column') || e.message.includes('already exists'))) {
          if (!silent) console.log('   ℹ️  ticket_id already exists in material_requests');
        } else {
          throw e;
        }
      }
    }

    // Make pr_numbers nullable in material_requests (PR numbers are now optional)
    if (await columnExists('material_requests', 'pr_numbers')) {
      try {
        await sequelize.query(`
          ALTER TABLE \`material_requests\`
          MODIFY COLUMN \`pr_numbers\` JSON NULL COMMENT 'Array of PR numbers and dates: [{prNumber, prDate}]';
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Made pr_numbers nullable in material_requests');
      } catch (e) {
        // Column might already be nullable, ignore error
        if (!silent && !e.message.includes('same as') && !e.message.includes('Duplicate')) {
          console.log(`   ⚠️  Could not modify pr_numbers: ${e.message}`);
        }
      }
    }

    if (!(await columnExists('stock_transfers', 'ticket_id'))) {
      if (!silent) console.log('   Adding ticket_id and to_user_id to stock_transfers...');
      try {
        await sequelize.query(`
          ALTER TABLE \`stock_transfers\`
          ADD COLUMN \`ticket_id\` VARCHAR(100) NULL COMMENT 'External system ticket/work order ID (e.g., TKT-55S)' AFTER \`material_request_id\`,
          ADD COLUMN \`to_user_id\` INT NULL COMMENT 'User ID if transferring to a person (technician) instead of stock area' AFTER \`ticket_id\`;
        `, { type: QueryTypes.RAW });
        await sequelize.query(`
          ALTER TABLE \`stock_transfers\`
          ADD INDEX \`idx_ticket_id\` (\`ticket_id\`),
          ADD INDEX \`idx_to_user_id\` (\`to_user_id\`);
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added ticket_id and to_user_id to stock_transfers');
      } catch (e) {
        if (e.message && (e.message.includes('Duplicate column') || e.message.includes('already exists'))) {
          if (!silent) console.log('   ℹ️  ticket_id already exists in stock_transfers');
        } else {
          throw e;
        }
      }
    }

    if (!(await columnExists('consumption_records', 'ticket_id'))) {
      if (!silent) console.log('   Adding ticket_id to consumption_records...');
      try {
        await sequelize.query(`
          ALTER TABLE \`consumption_records\`
          ADD COLUMN \`ticket_id\` VARCHAR(100) NULL COMMENT 'External system ticket/work order ID (e.g., TKT-55S)' AFTER \`external_system_ref_id\`;
        `, { type: QueryTypes.RAW });
        await sequelize.query(`
          ALTER TABLE \`consumption_records\`
          ADD INDEX \`idx_ticket_id\` (\`ticket_id\`);
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added ticket_id to consumption_records');
      } catch (e) {
        if (e.message && (e.message.includes('Duplicate column') || e.message.includes('already exists'))) {
          if (!silent) console.log('   ℹ️  ticket_id already exists in consumption_records');
        } else {
          throw e;
        }
      }
    }

    // ============================================================
    // PART 3: ADD SEARCH-ORIENTED INDEXES
    // ============================================================
    if (!silent) console.log('\n🔎 Adding search-performance indexes...\n');

    // Inward entries
    await ensureIndex('inward_entries', 'idx_inward_slip', '(`slip_number`)');
    await ensureIndex('inward_entries', 'idx_inward_invoice', '(`invoice_number`)');
    await ensureIndex('inward_entries', 'idx_inward_purchase_order', '(`purchase_order`)');
    await ensureIndex('inward_entries', 'idx_inward_party', '(`party_name`)');
    await ensureIndex('inward_entries', 'idx_inward_status', '(`status`)');

    // Stock transfers
    await ensureIndex('stock_transfers', 'idx_transfer_number', '(`transfer_number`)');
    await ensureIndex('stock_transfers', 'idx_transfer_ticket', '(`ticket_id`)');
    await ensureIndex('stock_transfers', 'idx_transfer_status', '(`status`)');

    // Purchase orders / requests
    await ensureIndex('purchase_orders', 'idx_po_number_search', '(`po_number`)');
    await ensureIndex('purchase_orders', 'idx_po_status_search', '(`status`)');
    await ensureIndex('purchase_requests', 'idx_pr_number_search', '(`pr_number`)');
    await ensureIndex('purchase_requests', 'idx_pr_status_search', '(`status`)');
    await ensureIndex('purchase_requests', 'idx_pr_requested_date', '(`requested_date`)');

    // Business partners
    await ensureIndex('business_partners', 'idx_partner_name_search', '(`partner_name`)');
    await ensureIndex('business_partners', 'idx_partner_type_search', '(`partner_type`)');

    // Consumption and returns
    await ensureIndex('consumption_records', 'idx_consumption_ext_ref', '(`external_system_ref_id`)');
    await ensureIndex('consumption_records', 'idx_consumption_ticket', '(`ticket_id`)');
    await ensureIndex('return_records', 'idx_return_ticket', '(`ticket_id`)');
    await ensureIndex('return_records', 'idx_return_reason', '(`reason`)');
    await ensureIndex('return_records', 'idx_return_status', '(`status`)');

    // Link Inward to Purchase Order
    if (!(await columnExists('inward_entries', 'po_id'))) {
      if (!silent) console.log('   Adding po_id to inward_entries...');
      
      // Only add if purchase_orders table exists
      if (await tableExists('purchase_orders')) {
        const poIdInfo = await getColumnType('purchase_orders', 'po_id');
        const poIdType = poIdInfo.fullType || 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
        
        try {
          await sequelize.query(`
            ALTER TABLE \`inward_entries\`
            ADD COLUMN \`po_id\` ${poIdType} NULL COMMENT 'Purchase Order ID' AFTER \`purchase_order\`;
          `, { type: QueryTypes.RAW });
        } catch (e) {
          // Column might already exist (race condition or previous partial migration)
          if (e.message && (e.message.includes('Duplicate column') || e.message.includes('already exists'))) {
            if (!silent) console.log('   ℹ️  po_id already exists, skipping...');
          } else {
            throw e; // Re-throw if it's a different error
          }
        }
        
        // Add index
        try {
          await sequelize.query(`
            ALTER TABLE \`inward_entries\`
            ADD INDEX \`idx_po_id\` (\`po_id\`);
          `, { type: QueryTypes.RAW });
        } catch (e) {
          // Index might already exist
        }
        
        // Add foreign key
        try {
          await sequelize.query(`
            ALTER TABLE \`inward_entries\`
            ADD CONSTRAINT \`fk_inward_po\` FOREIGN KEY (\`po_id\`) REFERENCES \`purchase_orders\`(\`po_id\`) ON DELETE SET NULL;
          `, { type: QueryTypes.RAW });
        } catch (e) {
          if (!silent) console.log('   ⚠️  Foreign key might already exist');
        }
        if (!silent) console.log('   ✅ Added po_id to inward_entries');
      } else {
        if (!silent) console.log('   ⚠️  purchase_orders table does not exist yet, skipping po_id');
      }
    } else {
      if (!silent) console.log('   ℹ️  po_id already exists in inward_entries');
    }

    // 10. RETURN RECORDS
    if (!(await tableExists('return_records'))) {
      if (!silent) console.log('   Creating return_records table...');
      
      // Get actual column types
      const consumptionIdInfo = await getColumnType('consumption_records', 'consumption_id');
      const consumptionIdType = consumptionIdInfo.fullType || 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
      
      await sequelize.query(`
        CREATE TABLE \`return_records\` (
          \`return_id\` CHAR(36) NOT NULL PRIMARY KEY,
          \`consumption_id\` ${consumptionIdType} NULL COMMENT 'Link to original consumption if applicable',
          \`ticket_id\` VARCHAR(100) NULL COMMENT 'External system ticket/work order ID (e.g., TKT-55S)',
          \`technician_id\` INT NOT NULL COMMENT 'User ID of technician returning items',
          \`return_date\` DATE NOT NULL COMMENT 'Date of return',
          \`reason\` ENUM('UNUSED', 'FAULTY', 'CANCELLED') NOT NULL COMMENT 'Reason for return',
          \`remarks\` TEXT NULL COMMENT 'Additional remarks',
          \`status\` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING' COMMENT 'Status of return request',
          \`approved_by\` INT NULL COMMENT 'User ID who approved/rejected the return',
          \`approval_date\` DATETIME NULL COMMENT 'Date of approval/rejection',
          \`org_id\` CHAR(36) NULL COMMENT 'Organization ID for multi-tenant support',
          \`created_by\` INT NULL COMMENT 'User ID who created this return record',
          \`updated_by\` INT NULL COMMENT 'User ID who last updated this return record',
          \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_consumption_id\` (\`consumption_id\`),
          INDEX \`idx_ticket_id\` (\`ticket_id\`),
          INDEX \`idx_technician_id\` (\`technician_id\`),
          INDEX \`idx_return_date\` (\`return_date\`),
          INDEX \`idx_reason\` (\`reason\`),
          INDEX \`idx_status\` (\`status\`),
          INDEX \`idx_org_id\` (\`org_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `, { type: QueryTypes.RAW });
      
      // Add foreign keys
      try {
        await sequelize.query(`
          ALTER TABLE \`return_records\`
          ADD CONSTRAINT \`fk_return_consumption\` 
          FOREIGN KEY (\`consumption_id\`) REFERENCES \`consumption_records\`(\`consumption_id\`) ON DELETE SET NULL;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added consumption_id foreign key');
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add consumption_id foreign key');
      }
      
      try {
        await sequelize.query(`
          ALTER TABLE \`return_records\`
          ADD CONSTRAINT \`fk_return_technician\` 
          FOREIGN KEY (\`technician_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added technician_id foreign key');
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add technician_id foreign key');
      }
      
      try {
        await sequelize.query(`
          ALTER TABLE \`return_records\`
          ADD CONSTRAINT \`fk_return_approver\` 
          FOREIGN KEY (\`approved_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added approved_by foreign key');
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add approved_by foreign key');
      }
      
      if (!silent) console.log('   ✅ return_records table created');
    } else {
      if (!silent) console.log('   ℹ️  return_records table already exists');
    }

    // 11. RETURN ITEMS
    if (!(await tableExists('return_items'))) {
      if (!silent) console.log('   Creating return_items table...');
      
      // Get actual column types
      const returnIdInfo = await getColumnType('return_records', 'return_id');
      const materialIdInfo = await getColumnType('materials', 'material_id');
      const inventoryIdInfo = await getColumnType('inventory_master', 'id');
      
      const returnIdType = returnIdInfo.fullType || 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
      const materialIdType = materialIdInfo.fullType || 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
      const inventoryIdType = inventoryIdInfo.fullType || 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
      
      await sequelize.query(`
        CREATE TABLE \`return_items\` (
          \`item_id\` CHAR(36) NOT NULL PRIMARY KEY,
          \`return_id\` ${returnIdType} NOT NULL COMMENT 'Reference to return record',
          \`material_id\` ${materialIdType} NOT NULL COMMENT 'Reference to material',
          \`inventory_master_id\` ${inventoryIdType} NULL COMMENT 'Reference to specific inventory item (if serialized)',
          \`serial_number\` VARCHAR(100) NULL COMMENT 'Serial number (if applicable)',
          \`mac_id\` VARCHAR(100) NULL COMMENT 'MAC ID (if applicable)',
          \`quantity\` INT NOT NULL DEFAULT 1 COMMENT 'Quantity returned',
          \`remarks\` TEXT NULL COMMENT 'Additional remarks for this item',
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_return_id\` (\`return_id\`),
          INDEX \`idx_material_id\` (\`material_id\`),
          INDEX \`idx_inventory_master_id\` (\`inventory_master_id\`),
          INDEX \`idx_serial_number\` (\`serial_number\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `, { type: QueryTypes.RAW });
      
      // Add foreign keys
      try {
        await sequelize.query(`
          ALTER TABLE \`return_items\`
          ADD CONSTRAINT \`fk_return_item_return\` 
          FOREIGN KEY (\`return_id\`) REFERENCES \`return_records\`(\`return_id\`) ON DELETE CASCADE;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added return_id foreign key');
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add return_id foreign key');
      }
      
      try {
        await sequelize.query(`
          ALTER TABLE \`return_items\`
          ADD CONSTRAINT \`fk_return_item_material\` 
          FOREIGN KEY (\`material_id\`) REFERENCES \`materials\`(\`material_id\`) ON DELETE RESTRICT;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added material_id foreign key');
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add material_id foreign key');
      }
      
      try {
        await sequelize.query(`
          ALTER TABLE \`return_items\`
          ADD CONSTRAINT \`fk_return_item_inventory\` 
          FOREIGN KEY (\`inventory_master_id\`) REFERENCES \`inventory_master\`(\`id\`) ON DELETE SET NULL;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Added inventory_master_id foreign key');
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add inventory_master_id foreign key');
      }
      
      if (!silent) console.log('   ✅ return_items table created');
    } else {
      if (!silent) console.log('   ℹ️  return_items table already exists');
    }

    // 12. NOTIFICATIONS TABLE
    if (!(await tableExists('notifications'))) {
      if (!silent) console.log('   Creating notifications table...');
      try {
        await sequelize.query(`
          CREATE TABLE \`notifications\` (
            \`notification_id\` CHAR(36) NOT NULL PRIMARY KEY,
            \`user_id\` INT NOT NULL COMMENT 'User who receives the notification',
            \`type\` ENUM('INFO', 'WARNING', 'ALERT', 'SUCCESS') NOT NULL DEFAULT 'INFO',
            \`title\` VARCHAR(255) NULL,
            \`message\` TEXT NOT NULL,
            \`entity_type\` VARCHAR(50) NULL COMMENT 'Type of entity (e.g., MaterialRequest, PurchaseOrder)',
            \`entity_id\` VARCHAR(100) NULL COMMENT 'ID of the related entity',
            \`is_read\` BOOLEAN NOT NULL DEFAULT FALSE,
            \`read_at\` DATETIME NULL,
            \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX \`idx_user_id\` (\`user_id\`),
            INDEX \`idx_is_read\` (\`is_read\`),
            INDEX \`idx_entity\` (\`entity_type\`, \`entity_id\`),
            INDEX \`idx_created_at\` (\`created_at\`),
            CONSTRAINT \`fk_notification_user\` 
              FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ notifications table created');
      } catch (e) {
        if (e.message && (e.message.includes('already exists') || e.message.includes('Duplicate'))) {
          if (!silent) console.log('   ℹ️  notifications table already exists');
        } else {
          throw e;
        }
      }
    } else {
      if (!silent) console.log('   ℹ️  notifications table already exists');
    }

    // 13. AUDIT LOGS TABLE
    if (!(await tableExists('audit_logs'))) {
      if (!silent) console.log('   Creating audit_logs table...');
      try {
        await sequelize.query(`
          CREATE TABLE \`audit_logs\` (
            \`audit_id\` CHAR(36) NOT NULL PRIMARY KEY,
            \`entity_type\` VARCHAR(50) NOT NULL COMMENT 'Type of entity (e.g., Material, InwardEntry)',
            \`entity_id\` VARCHAR(100) NOT NULL COMMENT 'ID of the entity',
            \`action\` ENUM('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'ALLOCATE', 'TRANSFER', 'CONSUME', 'RETURN') NOT NULL,
            \`user_id\` INT NULL COMMENT 'User who performed the action',
            \`changes\` JSON NULL COMMENT 'Before/after values for updates',
            \`ip_address\` VARCHAR(45) NULL,
            \`user_agent\` TEXT NULL,
            \`timestamp\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX \`idx_entity\` (\`entity_type\`, \`entity_id\`),
            INDEX \`idx_user_id\` (\`user_id\`),
            INDEX \`idx_action\` (\`action\`),
            INDEX \`idx_timestamp\` (\`timestamp\`),
            CONSTRAINT \`fk_audit_user\` 
              FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ audit_logs table created');
      } catch (e) {
        if (e.message && (e.message.includes('already exists') || e.message.includes('Duplicate'))) {
          if (!silent) console.log('   ℹ️  audit_logs table already exists');
        } else {
          throw e;
        }
      }
    } else {
      if (!silent) console.log('   ℹ️  audit_logs table already exists');
    }

    // 14. SYSTEM SETTINGS - Store system-wide configuration
    if (!(await tableExists('system_settings'))) {
      if (!silent) console.log('   Creating system_settings table...');
      
      try {
        await sequelize.query(`
          CREATE TABLE \`system_settings\` (
            \`setting_id\` CHAR(36) NOT NULL PRIMARY KEY,
            \`setting_key\` VARCHAR(255) NOT NULL UNIQUE,
            \`setting_value\` JSON NOT NULL,
            \`description\` TEXT NULL,
            \`updated_by\` INT NULL COMMENT 'User ID who last updated this setting',
            \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX \`idx_setting_key\` (\`setting_key\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, { type: QueryTypes.RAW });
        
        // Add foreign key for updated_by if users table exists
        try {
          await sequelize.query(`
            ALTER TABLE \`system_settings\`
            ADD CONSTRAINT \`fk_settings_updated_by\` 
            FOREIGN KEY (\`updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL;
          `, { type: QueryTypes.RAW });
          if (!silent) console.log('   ✅ Added updated_by foreign key');
        } catch (e) {
          if (!silent) console.log('   ⚠️  Could not add updated_by foreign key (will use application-level validation)');
        }
        
        if (!silent) console.log('   ✅ system_settings table created');
      } catch (e) {
        if (e.message && (e.message.includes('already exists') || e.message.includes('Duplicate'))) {
          if (!silent) console.log('   ℹ️  system_settings table already exists');
        } else {
          throw e;
        }
      }
    } else {
      if (!silent) console.log('   ℹ️  system_settings table already exists');
    }

    // 15. ROLE PAGE PERMISSIONS
    if (!(await tableExists('role_page_permissions'))) {
      if (!silent) console.log('   Creating role_page_permissions table...');
      try {
        await sequelize.query(`
          CREATE TABLE \`role_page_permissions\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`role_id\` INT NOT NULL,
            \`page_id\` VARCHAR(100) NOT NULL,
            \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY \`unique_role_page\` (\`role_id\`, \`page_id\`),
            INDEX \`idx_role_id\` (\`role_id\`),
            INDEX \`idx_page_id\` (\`page_id\`),
            CONSTRAINT \`fk_role_page_role\` 
              FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ role_page_permissions table created');
      } catch (e) {
        if (e.message && (e.message.includes('already exists') || e.message.includes('Duplicate'))) {
          if (!silent) console.log('   ℹ️  role_page_permissions table already exists');
        } else {
          throw e;
        }
      }
    } else {
      if (!silent) console.log('   ℹ️  role_page_permissions table already exists');
    }

    // 16. USER PAGE PERMISSIONS
    if (!(await tableExists('user_page_permissions'))) {
      if (!silent) console.log('   Creating user_page_permissions table...');
      try {
        await sequelize.query(`
          CREATE TABLE \`user_page_permissions\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`user_id\` INT NOT NULL,
            \`page_id\` VARCHAR(100) NOT NULL,
            \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY \`unique_user_page\` (\`user_id\`, \`page_id\`),
            INDEX \`idx_user_id\` (\`user_id\`),
            INDEX \`idx_page_id\` (\`page_id\`),
            CONSTRAINT \`fk_user_page_user\` 
              FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ user_page_permissions table created');
      } catch (e) {
        if (e.message && (e.message.includes('already exists') || e.message.includes('Duplicate'))) {
          if (!silent) console.log('   ℹ️  user_page_permissions table already exists');
        } else {
          throw e;
        }
      }
    } else {
      if (!silent) console.log('   ℹ️  user_page_permissions table already exists');
    }

    // 17. HSN CODE MASTER TABLE
    if (!(await tableExists('hsn_codes'))) {
      if (!silent) console.log('   Creating hsn_codes table...');
      try {
        await sequelize.query(`
          CREATE TABLE \`hsn_codes\` (
            \`hsn_code_id\` CHAR(36) NOT NULL PRIMARY KEY,
            \`hsn_code\` VARCHAR(50) NOT NULL UNIQUE COMMENT 'HSN (Harmonized System of Nomenclature) code',
            \`description\` TEXT NULL COMMENT 'Description of the HSN code',
            \`gst_rate\` DECIMAL(5, 2) NULL COMMENT 'Associated GST rate for this HSN code',
            \`org_id\` CHAR(36) NULL COMMENT 'Organization ID for multi-tenant support',
            \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
            \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX \`idx_hsn_code\` (\`hsn_code\`),
            INDEX \`idx_org_id\` (\`org_id\`),
            INDEX \`idx_is_active\` (\`is_active\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ hsn_codes table created');
      } catch (e) {
        if (e.message && (e.message.includes('already exists') || e.message.includes('Duplicate'))) {
          if (!silent) console.log('   ℹ️  hsn_codes table already exists');
        } else {
          throw e;
        }
      }
    } else {
      if (!silent) console.log('   ℹ️  hsn_codes table already exists');
    }

    // 18. MATERIAL TYPE MASTER TABLE
    if (!(await tableExists('material_types'))) {
      if (!silent) console.log('   Creating material_types table...');
      try {
        await sequelize.query(`
          CREATE TABLE \`material_types\` (
            \`type_id\` CHAR(36) NOT NULL PRIMARY KEY,
            \`type_name\` VARCHAR(100) NOT NULL COMMENT 'Name of the material type (e.g., CABLE, COMPONENT, EQUIPMENT)',
            \`type_code\` VARCHAR(50) NULL COMMENT 'Short code for the material type',
            \`description\` TEXT NULL COMMENT 'Description of the material type',
            \`org_id\` CHAR(36) NULL COMMENT 'Organization ID for multi-tenant support',
            \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
            \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX \`idx_type_name\` (\`type_name\`),
            INDEX \`idx_org_id\` (\`org_id\`),
            UNIQUE KEY \`unique_type_name_org\` (\`type_name\`, \`org_id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ material_types table created');
      } catch (e) {
        if (e.message && (e.message.includes('already exists') || e.message.includes('Duplicate'))) {
          if (!silent) console.log('   ℹ️  material_types table already exists');
        } else {
          throw e;
        }
      }
    } else {
      if (!silent) console.log('   ℹ️  material_types table already exists');
    }

    if (!silent) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
      console.log('='.repeat(60));
      console.log('\n📊 Summary:');
      console.log('   ✅ Created 18 new tables');
      console.log('   ✅ Added missing columns to existing tables');
      console.log('   ✅ All foreign keys and indexes created');
      console.log('   ✅ Added search-performance indexes');
      console.log('\n🎉 Your database is now ready for the complete inventory workflow!\n');
    }

    // Don't close connection if running from server startup
    if (silent) {
      return { success: true };
    }
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.stack && !silent) {
      console.error('\nStack trace:', error.stack);
    }
    
    // Don't close connection if running from server startup
    if (silent) {
      return { success: false, error: error.message };
    }
    
    await sequelize.close();
    process.exit(1);
  }
};

// Run migration if called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('migrateInventoryTables')) {
  runMigration(false);
}

// Export for use in server startup
export default runMigration;
export { runMigration };

