import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Material = sequelize.define('material', {
  material_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  material_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Name of the material/item'
  },
  product_code: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Product code/SKU'
  },
  material_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Type of material (COMPONENT, CABLE, EQUIPMENT, etc.)'
  },
  uom: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'PIECE(S)',
    comment: 'Unit of measurement'
  },
  properties: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional properties/specifications as JSON'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of the material'
  },
  hsn: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'HSN (Harmonized System of Nomenclature) code - international standard code'
  },
  gst_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'GST percentage for the material'
  },
  sgst_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'SGST percentage for the material'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Price of the material'
  },
  asset_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Asset ID for the material'
  },
  material_property: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Material property information'
  },
  documents: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of document file paths/URLs'
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
  tableName: 'materials',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['material_type']
    },
    {
      fields: ['product_code']
    },
    {
      fields: ['org_id']
    },
    {
      unique: true,
      fields: ['product_code', 'org_id'],
      name: 'unique_product_code_org'
    }
  ]
});

export default Material;













