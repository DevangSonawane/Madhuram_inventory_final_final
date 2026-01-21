import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MaterialRequestItem = sequelize.define('material_request_item', {
  item_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  request_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to material request'
  },
  material_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to material'
  },
  requested_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Quantity requested'
  },
  approved_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Quantity approved (can be less than requested)'
  },
  uom: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'PIECE(S)',
    comment: 'Unit of measurement'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional remarks'
  },
}, {
  tableName: 'material_request_items',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['request_id']
    },
    {
      fields: ['material_id']
    }
  ]
});

export default MaterialRequestItem;













