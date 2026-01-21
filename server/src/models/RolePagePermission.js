import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const RolePagePermission = sequelize.define('RolePagePermission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'roles', key: 'id' },
    onDelete: 'CASCADE',
  },
  page_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Page identifier (e.g., inventory-stock, material-request)',
  },
}, {
  tableName: 'role_page_permissions',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['role_id', 'page_id'] },
    { fields: ['role_id'] },
    { fields: ['page_id'] },
  ],
});

export default RolePagePermission;

