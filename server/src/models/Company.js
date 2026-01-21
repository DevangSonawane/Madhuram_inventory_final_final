import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Company = sequelize.define('company', {
  company_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  company_code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Short code for company (EXPL, EXP, GFN, etc.)'
  },
  company_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Full company name'
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
  tableName: 'companies',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['org_id']
    },
    {
      unique: true,
      fields: ['company_code', 'org_id'],
      name: 'unique_company_org'
    }
  ]
});

export default Company;

