import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const InwardEntry = sequelize.define('inward_entry', {
  inward_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date of inward entry'
  },
  invoice_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Invoice number from vendor'
  },
  party_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Vendor/party name'
  },
  purchase_order: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Purchase order number (legacy field)'
  },
  po_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Purchase Order ID (links to purchase_orders table)'
  },
  stock_area_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Stock area where items are stored'
  },
  vehicle_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Vehicle number for delivery'
  },
  slip_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'GRN/Slip number (auto-generated)'
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'COMPLETED', 'CANCELLED'),
    defaultValue: 'DRAFT',
    comment: 'Status of inward entry'
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional remarks'
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
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID who created this entry'
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID who last updated this entry'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'inward_entries',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['date']
    },
    {
      fields: ['invoice_number']
    },
    {
      fields: ['party_name']
    },
    {
      fields: ['stock_area_id']
    },
    {
      fields: ['slip_number']
    },
    {
      fields: ['status']
    },
    {
      fields: ['org_id']
    },
    {
      fields: ['po_id']
    }
  ]
});

export default InwardEntry;











