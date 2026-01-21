import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MaterialRequest = sequelize.define('material_request', {
  request_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  mr_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
    comment: 'Auto-generated MR number: MR-month(abv)-year-number'
  },
  request_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Request date (user selection or current day)'
  },
  requestor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Employee/Technician ID who is requesting'
  },
  group_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Reference to group'
  },
  team_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Reference to team'
  },
  service_area: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Service area (states in Goa)'
  },
  from_stock_area_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Source stock area ID'
  },
  pr_numbers: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of PR numbers and dates: [{prNumber, prDate}]'
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'FULFILLED'),
    defaultValue: 'DRAFT',
    comment: 'Status of material request'
  },
  requested_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'User ID who requested'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID who created the MR'
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
  ticket_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'External system ticket/work order ID (e.g., TKT-55S)'
  },
  ticket_status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Ticket status from external system'
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
  tableName: 'material_requests',
  timestamps: true,
  underscored: true,
  indexes: [
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
      fields: ['ticket_id']
    },
    {
      fields: ['mr_number']
    },
    {
      fields: ['requestor_id']
    },
    {
      fields: ['group_id']
    },
    {
      fields: ['team_id']
    },
    {
      fields: ['from_stock_area_id']
    },
    {
      fields: ['created_by']
    }
  ]
});

export default MaterialRequest;










