import { Sequelize, DataTypes, QueryTypes } from 'sequelize';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from the server root directory (two levels up from config/)
dotenv.config({ path: join(__dirname, '../../.env') });

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('📝 Please create a .env file in the server root directory with the following variables:');
  console.error('   DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT (optional)');
  process.exit(1);
}

// Production database configuration
const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: isProduction ? 10 : 5,
      min: isProduction ? 2 : 0,
      acquire: 30000,
      idle: 10000,
      evict: 1000
    },
    dialectOptions: isProduction ? {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false,
      connectTimeout: 60000
    } : {},
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    },
    retry: {
      max: 3
    }
  }
);

const ensureUserColumnsExist = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const database =
    typeof sequelize.getDatabaseName === 'function'
      ? sequelize.getDatabaseName()
      : sequelize.config?.database;

  try {
    const columns = await sequelize.query(
      `
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = :schema 
          AND TABLE_NAME = 'users'
      `,
      {
        replacements: { schema: database },
        type: QueryTypes.SELECT
      }
    );

    const columnNames = Array.isArray(columns)
      ? columns.map((row) => row.COLUMN_NAME)
      : [];

    const hasEmployeeCode = columnNames.includes('employee_code');
    const hasEmployeCode = columnNames.includes('employe_code');
    const hasPhoneNumber = columnNames.includes('phone_number');
    const hasRefreshToken = columnNames.includes('refresh_token');
    const hasIsActive = columnNames.includes('is_active');

    // Handle employee_code column
    if (!hasEmployeeCode && hasEmployeCode) {
      await queryInterface.renameColumn('users', 'employe_code', 'employee_code');
      console.log('✅ Renamed column employe_code -> employee_code on users table.');
    } else if (!hasEmployeeCode) {
      await queryInterface.addColumn('users', 'employee_code', {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true
      });
      console.log('✅ Added missing column employee_code on users table.');
    }

    // Handle phone_number column
    if (!hasPhoneNumber) {
      await queryInterface.addColumn('users', 'phone_number', {
        type: DataTypes.STRING(15),
        allowNull: true,
        unique: true
      });
      console.log('✅ Added missing column phone_number on users table.');
    }

    // Handle refresh_token column
    if (!hasRefreshToken) {
      await queryInterface.addColumn('users', 'refresh_token', {
        type: DataTypes.TEXT,
        allowNull: true
      });
      console.log('✅ Added missing column refresh_token on users table.');
    }

    // Handle is_active column
    if (!hasIsActive) {
      await queryInterface.addColumn('users', 'is_active', {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      });
      console.log('✅ Added missing column is_active on users table.');
    }
  } catch (error) {
    console.warn('⚠️ Could not verify columns on users table using information_schema:', error.message);
    try {
      const tableDefinition = await queryInterface.describeTable('users');
      const hasEmployeeCode = Object.prototype.hasOwnProperty.call(tableDefinition, 'employee_code');
      const hasEmployeCode = Object.prototype.hasOwnProperty.call(tableDefinition, 'employe_code');
      const hasPhoneNumber = Object.prototype.hasOwnProperty.call(tableDefinition, 'phone_number');
      const hasRefreshToken = Object.prototype.hasOwnProperty.call(tableDefinition, 'refresh_token');
      const hasIsActive = Object.prototype.hasOwnProperty.call(tableDefinition, 'is_active');

      // Handle employee_code column
      if (!hasEmployeeCode && hasEmployeCode) {
        await queryInterface.renameColumn('users', 'employe_code', 'employee_code');
        console.log('✅ Renamed column employe_code -> employee_code on users table (fallback).');
      } else if (!hasEmployeeCode) {
        await queryInterface.addColumn('users', 'employee_code', {
          type: DataTypes.STRING(50),
          allowNull: true,
          unique: true
        });
        console.log('✅ Added missing column employee_code on users table (fallback).');
      }

      // Handle phone_number column
      if (!hasPhoneNumber) {
        await queryInterface.addColumn('users', 'phone_number', {
          type: DataTypes.STRING(15),
          allowNull: true,
          unique: true
        });
        console.log('✅ Added missing column phone_number on users table (fallback).');
      }

      // Handle refresh_token column
      if (!hasRefreshToken) {
        await queryInterface.addColumn('users', 'refresh_token', {
          type: DataTypes.TEXT,
          allowNull: true
        });
        console.log('✅ Added missing column refresh_token on users table (fallback).');
      }

      // Handle is_active column
      if (!hasIsActive) {
        await queryInterface.addColumn('users', 'is_active', {
          type: DataTypes.BOOLEAN,
          defaultValue: true
        });
        console.log('✅ Added missing column is_active on users table (fallback).');
      }
    } catch (fallbackError) {
      console.warn('⚠️ Fallback attempt to ensure columns failed:', fallbackError.message);
    }
  }
};

const ensureSurveyColumnsExist = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const database =
    typeof sequelize.getDatabaseName === 'function'
      ? sequelize.getDatabaseName()
      : sequelize.config?.database;

  try {
    const columns = await sequelize.query(
      `
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = :schema 
          AND TABLE_NAME = 'survey'
      `,
      {
        replacements: { schema: database },
        type: QueryTypes.SELECT
      }
    );

    const columnNames = Array.isArray(columns)
      ? columns.map((row) => row.COLUMN_NAME)
      : [];

    const hasUserId = columnNames.includes('user_id');
    const hasLatitude = columnNames.includes('latitude');
    const hasLongitude = columnNames.includes('longitude');

    // Handle user_id column
    if (!hasUserId) {
      await queryInterface.addColumn('survey', 'user_id', {
        type: DataTypes.INTEGER,
        allowNull: true
      });
      console.log('✅ Added missing column user_id on survey table.');
    }

    // Handle latitude column
    if (!hasLatitude) {
      await queryInterface.addColumn('survey', 'latitude', {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true
      });
      console.log('✅ Added missing column latitude on survey table.');
    }

    // Handle longitude column
    if (!hasLongitude) {
      await queryInterface.addColumn('survey', 'longitude', {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true
      });
      console.log('✅ Added missing column longitude on survey table.');
    }
  } catch (error) {
    console.warn('⚠️ Could not verify columns on survey table:', error.message);
    try {
      const tableDefinition = await queryInterface.describeTable('survey');
      const hasUserId = Object.prototype.hasOwnProperty.call(tableDefinition, 'user_id');
      const hasLatitude = Object.prototype.hasOwnProperty.call(tableDefinition, 'latitude');
      const hasLongitude = Object.prototype.hasOwnProperty.call(tableDefinition, 'longitude');

      // Handle user_id column
      if (!hasUserId) {
        await queryInterface.addColumn('survey', 'user_id', {
          type: DataTypes.INTEGER,
          allowNull: true
        });
        console.log('✅ Added missing column user_id on survey table (fallback).');
      }

      // Handle latitude column
      if (!hasLatitude) {
        await queryInterface.addColumn('survey', 'latitude', {
          type: DataTypes.DECIMAL(10, 7),
          allowNull: true
        });
        console.log('✅ Added missing column latitude on survey table (fallback).');
      }

      // Handle longitude column
      if (!hasLongitude) {
        await queryInterface.addColumn('survey', 'longitude', {
          type: DataTypes.DECIMAL(10, 7),
          allowNull: true
        });
        console.log('✅ Added missing column longitude on survey table (fallback).');
      }
    } catch (fallbackError) {
      console.warn('⚠️ Fallback attempt to ensure survey columns failed:', fallbackError.message);
    }
  }
};

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Import models first to ensure they're loaded
    await import('../models/index.js');

    // Run migrations to ensure schema is up to date (fixes missing columns, indexes, etc.)
    try {
      const migrationModule = await import('../scripts/migrateInventoryTables.js');
      const runMigration = migrationModule.default || migrationModule.runMigration;
      if (runMigration && typeof runMigration === 'function') {
        const result = await runMigration(true); // Run silently
        if (result && result.success === false) {
          console.warn('⚠️  Migration completed with warnings:', result.error);
        } else {
          console.log('✅ Database migrations completed.');
        }
      }
    } catch (migrationError) {
      console.warn('⚠️  Migration warning:', migrationError.message);
      // Continue even if migration has issues - table might already be correct
    }

    // Don't sync models - migrations handle all schema changes
    // Sync can cause issues with indexes on non-existent columns
    // Only sync if explicitly enabled via environment variable
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_SYNC === 'true') {
      try {
        await sequelize.sync({ alter: false, force: false });
        console.log('✅ Database models synchronized.');
      } catch (syncError) {
        console.warn('⚠️  Sync warning (non-critical):', syncError.message);
        // Don't fail - migrations handle schema
      }
    }
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

export default sequelize;