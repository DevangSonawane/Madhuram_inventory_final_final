import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PurchaseRequestItem = sequelize.define('purchase_request_item', {
  item_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  pr_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to purchase request'
  },
  material_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to material'
  },
  requested_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Requested quantity'
  },
  uom: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'PIECE(S)',
    comment: 'Unit of measure'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional remarks'
  },
  pr_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Name of the product requested'
  },
  business_partner_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Reference to business partner (supplier)'
  },
  material_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Type of material (references material_types table)'
  },
  shipping_address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Shipping address (warehouse address)'
  },
  billing_address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Billing address (auto-populated from warehouse)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of the item'
  },
}, {
  tableName: 'purchase_request_items',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['pr_id']
    },
    {
      fields: ['material_id']
    },
    {
      fields: ['business_partner_id']
    },
    {
      fields: ['material_type']
    }
  ]
});

export default PurchaseRequestItem;



