import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ReturnItem = sequelize.define('return_item', {
  item_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  return_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to return record'
  },
  material_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to material'
  },
  inventory_master_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Reference to specific inventory item (if serialized)'
  },
  serial_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Serial number (if applicable)'
  },
  mac_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'MAC ID (if applicable)'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Quantity returned'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional remarks for this item'
  },
}, {
  tableName: 'return_items',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['return_id']
    },
    {
      fields: ['material_id']
    },
    {
      fields: ['inventory_master_id']
    },
    {
      fields: ['serial_number']
    }
  ]
});

export default ReturnItem;




