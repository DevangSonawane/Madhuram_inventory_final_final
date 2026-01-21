import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ReturnRecord = sequelize.define('return_record', {
  return_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  consumption_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Link to original consumption if applicable'
  },
  ticket_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'External system ticket/work order ID (e.g., TKT-55S)'
  },
  technician_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'User ID of technician returning items'
  },
  return_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date of return'
  },
  reason: {
    type: DataTypes.ENUM('UNUSED', 'FAULTY', 'CANCELLED'),
    allowNull: false,
    comment: 'Reason for return'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional remarks'
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
    allowNull: false,
    defaultValue: 'PENDING',
    comment: 'Status of return request'
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID who approved/rejected the return'
  },
  approval_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date of approval/rejection'
  },
  org_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Organization ID for multi-tenant support'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID who created this return record'
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID who last updated this return record'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'return_records',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['consumption_id']
    },
    {
      fields: ['ticket_id']
    },
    {
      fields: ['technician_id']
    },
    {
      fields: ['return_date']
    },
    {
      fields: ['reason']
    },
    {
      fields: ['status']
    },
    {
      fields: ['org_id']
    }
  ]
});

export default ReturnRecord;




