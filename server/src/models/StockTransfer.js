import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const StockTransfer = sequelize.define('stock_transfer', {
  transfer_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  from_stock_area_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Source stock area'
  },
  to_stock_area_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Destination stock area'
  },
  material_request_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Reference to material request (if transfer is for a request)'
  },
  ticket_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'External system ticket/work order ID (e.g., TKT-55S)'
  },
  to_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID if transferring to a person (technician) instead of stock area'
  },
  transfer_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date of transfer'
  },
  transfer_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Transfer slip number (auto-generated)'
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'),
    defaultValue: 'DRAFT',
    comment: 'Status of transfer'
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
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID who created this transfer'
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID who last updated this transfer'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'stock_transfers',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['from_stock_area_id']
    },
    {
      fields: ['to_stock_area_id']
    },
    {
      fields: ['material_request_id']
    },
    {
      fields: ['transfer_date']
    },
    {
      fields: ['transfer_number']
    },
    {
      fields: ['status']
    },
    {
      fields: ['org_id']
    },
    {
      fields: ['ticket_id']
    },
    {
      fields: ['to_user_id']
    }
  ]
});

export default StockTransfer;










