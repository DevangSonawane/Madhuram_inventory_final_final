import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AssetType = sequelize.define('asset_type', {
  asset_type_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Name of asset type (Banner, Flyer, Board, Cap, Others, etc.)'
  },
  type_code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Short code for asset type'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  org_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Organization ID for multi-tenant support'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'asset_types',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['org_id']
    },
    {
      unique: true,
      fields: ['type_code', 'org_id'],
      name: 'unique_type_org'
    }
  ]
});

export default AssetType;

