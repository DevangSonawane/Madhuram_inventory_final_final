import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const UserPagePermission = sequelize.define('UserPagePermission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  page_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Page identifier (e.g., inventory-stock, material-request)',
  },
}, {
  tableName: 'user_page_permissions',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['user_id', 'page_id'] },
    { fields: ['user_id'] },
    { fields: ['page_id'] },
  ],
});

export default UserPagePermission;

