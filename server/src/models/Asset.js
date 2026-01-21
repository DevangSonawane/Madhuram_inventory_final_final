import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Asset = sequelize.define('asset', {
  asset_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  asset_type: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Type of asset (Banner, Flyer, Board, Cap, Others, etc.)'
  },
  company: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Company name (EXPL, EXP, GFN, etc.)'
  },
  total_in: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Total quantity added/received'
  },
  total_out: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Total quantity distributed/used'
  },
  balance: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Current available balance (total_in - total_out)'
  },
  threshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Minimum threshold for low stock alert'
  },
  org_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Organization ID for multi-tenant support'
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'User ID who created this asset'
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'User ID who last updated this asset'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'assets',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['asset_type']
    },
    {
      fields: ['company']
    },
    {
      fields: ['org_id']
    },
    {
      unique: true,
      fields: ['asset_type', 'company', 'org_id'],
      name: 'unique_asset_company_org'
    }
  ]
});

export default Asset;

