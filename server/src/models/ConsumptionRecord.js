import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ConsumptionRecord = sequelize.define('consumption_record', {
  consumption_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  external_system_ref_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Reference ID from external system (e.g., customer ID, project ID)'
  },
  ticket_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'External system ticket/work order ID (e.g., TKT-55S)'
  },
  customer_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Customer/project data as JSON: {customerName, customerEmail, address, etc.}'
  },
  consumption_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date of consumption'
  },
  stock_area_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Stock area from which items were consumed'
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
    comment: 'User ID who recorded this consumption'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'consumption_records',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['external_system_ref_id']
    },
    {
      fields: ['consumption_date']
    },
    {
      fields: ['stock_area_id']
    },
    {
      fields: ['org_id']
    },
    {
      fields: ['ticket_id']
    }
  ]
});

export default ConsumptionRecord;

