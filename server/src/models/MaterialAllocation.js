import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MaterialAllocation = sequelize.define('material_allocation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  material_request_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to material request'
  },
  material_request_item_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to material request item'
  },
  inventory_master_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'The specific item (Serial No) allocated from inventory_master'
  },
  allocated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID who allocated (Store Keeper)'
  },
  allocated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Date and time of allocation'
  },
  status: {
    type: DataTypes.ENUM('ALLOCATED', 'TRANSFERRED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'ALLOCATED',
    comment: 'Status of allocation'
  },
}, {
  tableName: 'material_allocation',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['material_request_id']
    },
    {
      fields: ['material_request_item_id']
    },
    {
      fields: ['inventory_master_id']
    },
    {
      fields: ['allocated_by']
    },
    {
      fields: ['status']
    }
  ]
});

export default MaterialAllocation;




