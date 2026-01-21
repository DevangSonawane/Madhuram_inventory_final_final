import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * Migration script to create chat system tables
 * Creates: faqs, chat_conversations, chat_messages, faq_interactions
 * 
 * Run with: node src/scripts/migrateChatTables.js
 */

const runMigration = async (silent = false) => {
  try {
    if (!silent) {
      console.log('🚀 Starting Chat System Database Migration...\n');
    }
    
    // Connect to database
    await sequelize.authenticate();
    if (!silent) {
      console.log('✅ Database connected successfully\n');
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
        return Array.isArray(results) && results.length > 0;
      } catch (error) {
        return false;
      }
    };

    if (!silent) {
      console.log('📦 Creating chat system tables...\n');
    }

    // 1. FAQs Table
    if (!(await tableExists('faqs'))) {
      if (!silent) console.log('   Creating faqs table...');
      
      await sequelize.query(`
        CREATE TABLE \`faqs\` (
          \`faq_id\` INT PRIMARY KEY AUTO_INCREMENT,
          \`question\` TEXT NOT NULL,
          \`answer\` TEXT NOT NULL,
          \`category\` VARCHAR(100) NULL,
          \`keywords\` TEXT NULL COMMENT 'JSON array for search',
          \`view_count\` INT NOT NULL DEFAULT 0,
          \`helpful_count\` INT NOT NULL DEFAULT 0,
          \`not_helpful_count\` INT NOT NULL DEFAULT 0,
          \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_category\` (\`category\`),
          INDEX \`idx_active\` (\`is_active\`),
          FULLTEXT INDEX \`idx_search\` (\`question\`, \`answer\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `, { type: QueryTypes.RAW });
      
      if (!silent) console.log('   ✅ faqs table created');
    } else {
      if (!silent) console.log('   ℹ️  faqs table already exists');
    }

    // 2. Chat Conversations Table
    if (!(await tableExists('chat_conversations'))) {
      if (!silent) console.log('   Creating chat_conversations table...');
      
      await sequelize.query(`
        CREATE TABLE \`chat_conversations\` (
          \`conversation_id\` INT PRIMARY KEY AUTO_INCREMENT,
          \`employee_id\` INT NOT NULL,
          \`admin_id\` INT NULL,
          \`status\` ENUM('open', 'active', 'resolved', 'closed') NOT NULL DEFAULT 'open',
          \`last_message_at\` DATETIME NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_employee\` (\`employee_id\`),
          INDEX \`idx_admin\` (\`admin_id\`),
          INDEX \`idx_status\` (\`status\`),
          INDEX \`idx_last_message\` (\`last_message_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `, { type: QueryTypes.RAW });
      
      // Add foreign keys
      try {
        await sequelize.query(`
          ALTER TABLE \`chat_conversations\`
          ADD CONSTRAINT \`fk_conv_employee\` FOREIGN KEY (\`employee_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
          ADD CONSTRAINT \`fk_conv_admin\` FOREIGN KEY (\`admin_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Foreign keys added to chat_conversations');
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add foreign keys to chat_conversations');
      }
      
      if (!silent) console.log('   ✅ chat_conversations table created');
    } else {
      if (!silent) console.log('   ℹ️  chat_conversations table already exists');
    }

    // 3. Chat Messages Table
    if (!(await tableExists('chat_messages'))) {
      if (!silent) console.log('   Creating chat_messages table...');
      
      await sequelize.query(`
        CREATE TABLE \`chat_messages\` (
          \`message_id\` INT PRIMARY KEY AUTO_INCREMENT,
          \`conversation_id\` INT NOT NULL,
          \`sender_id\` INT NOT NULL,
          \`message\` TEXT NOT NULL,
          \`is_read\` BOOLEAN NOT NULL DEFAULT FALSE,
          \`read_at\` DATETIME NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_conversation\` (\`conversation_id\`),
          INDEX \`idx_sender\` (\`sender_id\`),
          INDEX \`idx_created\` (\`created_at\`),
          INDEX \`idx_read\` (\`is_read\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `, { type: QueryTypes.RAW });
      
      // Add foreign keys
      try {
        await sequelize.query(`
          ALTER TABLE \`chat_messages\`
          ADD CONSTRAINT \`fk_msg_conversation\` FOREIGN KEY (\`conversation_id\`) REFERENCES \`chat_conversations\`(\`conversation_id\`) ON DELETE CASCADE,
          ADD CONSTRAINT \`fk_msg_sender\` FOREIGN KEY (\`sender_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Foreign keys added to chat_messages');
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add foreign keys to chat_messages');
      }
      
      if (!silent) console.log('   ✅ chat_messages table created');
    } else {
      if (!silent) console.log('   ℹ️  chat_messages table already exists');
    }

    // 4. FAQ Interactions Table
    if (!(await tableExists('faq_interactions'))) {
      if (!silent) console.log('   Creating faq_interactions table...');
      
      await sequelize.query(`
        CREATE TABLE \`faq_interactions\` (
          \`interaction_id\` INT PRIMARY KEY AUTO_INCREMENT,
          \`user_id\` INT NOT NULL,
          \`faq_id\` INT NULL,
          \`action\` ENUM('viewed', 'clicked', 'helpful', 'not_helpful') NOT NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_user\` (\`user_id\`),
          INDEX \`idx_faq\` (\`faq_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `, { type: QueryTypes.RAW });
      
      // Add foreign keys
      try {
        await sequelize.query(`
          ALTER TABLE \`faq_interactions\`
          ADD CONSTRAINT \`fk_interaction_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
          ADD CONSTRAINT \`fk_interaction_faq\` FOREIGN KEY (\`faq_id\`) REFERENCES \`faqs\`(\`faq_id\`) ON DELETE SET NULL;
        `, { type: QueryTypes.RAW });
        if (!silent) console.log('   ✅ Foreign keys added to faq_interactions');
      } catch (e) {
        if (!silent) console.log('   ⚠️  Could not add foreign keys to faq_interactions');
      }
      
      if (!silent) console.log('   ✅ faq_interactions table created');
    } else {
      if (!silent) console.log('   ℹ️  faq_interactions table already exists');
    }

    if (!silent) {
      console.log('\n✅ Chat system database migration completed successfully!\n');
    }

    return { success: true };
  } catch (error) {
    if (!silent) {
      console.error('❌ Migration error:', error);
    }
    return { success: false, error: error.message };
  }
};

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration(false).then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

export default runMigration;

