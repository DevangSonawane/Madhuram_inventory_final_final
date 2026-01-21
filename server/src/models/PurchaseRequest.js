import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PurchaseRequest = sequelize.define('purchase_request', {
  pr_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  pr_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Purchase Request Number (e.g., PR-2025-001)'
  },
  requested_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'User ID who requested'
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'),
    defaultValue: 'DRAFT',
    allowNull: false,
    comment: 'Status of purchase request'
  },
  requested_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date of request'
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID who approved/rejected'
  },
  approval_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date of approval/rejection'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional remarks or rejection reason'
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
  tableName: 'purchase_requests',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['pr_number']
    },
    {
      fields: ['status']
    },
    {
      fields: ['requested_by']
    },
    {
      fields: ['approved_by']
    },
    {
      fields: ['org_id']
    },
    {
      fields: ['is_active']
    }
  ]
});

export default PurchaseRequest;



