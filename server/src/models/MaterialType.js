import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MaterialType = sequelize.define('material_type', {
  type_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Name of the material type (e.g., CABLE, COMPONENT, EQUIPMENT)'
  },
  type_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Short code for the material type'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of the material type'
  },
  org_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Organization ID for multi-tenant support'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
}, {
  tableName: 'material_types',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['type_name']
    },
    {
      fields: ['org_id']
    },
    {
      unique: true,
      fields: ['type_name', 'org_id'],
      name: 'unique_type_name_org'
    }
  ]
});

export default MaterialType;

