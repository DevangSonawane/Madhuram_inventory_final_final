import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PurchaseOrder = sequelize.define('purchase_order', {
  po_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  po_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Purchase Order Number (e.g., PO-2025-001)'
  },
  pr_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Links to Purchase Request'
  },
  vendor_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Business Partner ID (Supplier/Vendor)'
  },
  po_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Purchase Order date'
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SENT', 'RECEIVED', 'DELIVERED', 'CANCELLED'),
    defaultValue: 'DRAFT',
    allowNull: false,
    comment: 'Status of purchase order'
  },
  total_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0.00,
    comment: 'Total amount of purchase order'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional remarks'
  },
  org_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Organization ID for multi-tenant support'
  },
  documents: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of document file paths'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
}, {
  tableName: 'purchase_orders',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['po_number']
    },
    {
      fields: ['pr_id']
    },
    {
      fields: ['vendor_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['org_id']
    },
    {
      fields: ['is_active']
    }
  ]
});

export default PurchaseOrder;



