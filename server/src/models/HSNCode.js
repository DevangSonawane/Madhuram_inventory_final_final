import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const HSNCode = sequelize.define('hsn_code', {
  hsn_code_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  hsn_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'HSN (Harmonized System of Nomenclature) code'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of the HSN code'
  },
  gst_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Default GST rate for this HSN code'
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
  tableName: 'hsn_codes',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['hsn_code']
    },
    {
      fields: ['org_id']
    },
    {
      fields: ['is_active']
    }
  ]
});

export default HSNCode;

