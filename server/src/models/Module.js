import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';

const Module = sequelize.define('Module', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  description: {
    type:  DataTypes.STRING(255),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
}, {
  tableName: 'modules',
  timestamps: true,
});

export default Module;
