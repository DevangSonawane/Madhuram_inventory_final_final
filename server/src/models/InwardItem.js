import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const InwardItem = sequelize.define('inward_item', {
  item_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  inward_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to inward entry'
  },
  material_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to material'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Quantity received'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Unit price'
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
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional remarks for this item'
  },
}, {
  tableName: 'inward_items',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['inward_id']
    },
    {
      fields: ['material_id']
    },
    {
      fields: ['serial_number']
    }
  ]
});

export default InwardItem;













