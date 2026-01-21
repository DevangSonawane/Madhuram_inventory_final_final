import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SystemSettings = sequelize.define('SystemSettings', {
  setting_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  setting_key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  setting_value: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'system_settings',
  timestamps: true,
  underscored: true,
});

export default SystemSettings;

