import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ConsumptionItem = sequelize.define('consumption_item', {
  item_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  consumption_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to consumption record'
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
    comment: 'Quantity consumed'
  },
  serial_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Serial number (if applicable)'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional remarks'
  },
}, {
  tableName: 'consumption_items',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['consumption_id']
    },
    {
      fields: ['material_id']
    },
    {
      fields: ['serial_number']
    }
  ]
});

export default ConsumptionItem;













