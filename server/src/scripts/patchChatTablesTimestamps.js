import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * One-time patch script to add missing updated_at columns to chat tables
 * Run with: node src/scripts/patchChatTablesTimestamps.js
 */
const runPatch = async (silent = false) => {
  const log = (...args) => !silent && console.log(...args);

  const columnExists = async (table, column) => {
    const rows = await sequelize.query(
      `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = :table
        AND COLUMN_NAME = :column
      `,
      {
        replacements: { table, column },
        type: QueryTypes.SELECT,
      }
    );
    return rows.length > 0;
  };

  try {
    await sequelize.authenticate();
    log('✅ Database connected');

    // chat_messages.updated_at
    if (!(await columnExists('chat_messages', 'updated_at'))) {
      log('Adding updated_at to chat_messages...');
      await sequelize.query(
        `
        ALTER TABLE \`chat_messages\`
        ADD COLUMN \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        AFTER \`created_at\`;
        `,
        { type: QueryTypes.RAW }
      );
      log('✅ added updated_at to chat_messages');
    } else {
      log('ℹ️ updated_at already exists on chat_messages');
    }

    // faq_interactions.updated_at
    if (!(await columnExists('faq_interactions', 'updated_at'))) {
      log('Adding updated_at to faq_interactions...');
      await sequelize.query(
        `
        ALTER TABLE \`faq_interactions\`
        ADD COLUMN \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        AFTER \`created_at\`;
        `,
        { type: QueryTypes.RAW }
      );
      log('✅ added updated_at to faq_interactions');
    } else {
      log('ℹ️ updated_at already exists on faq_interactions');
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Patch failed:', error.message);
    return { success: false, error: error.message };
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  runPatch(false)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default runPatch;

