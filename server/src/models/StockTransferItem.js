import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const StockTransferItem = sequelize.define('stock_transfer_item', {
  item_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  transfer_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to stock transfer'
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
    comment: 'Quantity transferred'
  },
  serial_numbers: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of serial numbers (if applicable)'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional remarks'
  },
}, {
  tableName: 'stock_transfer_items',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['transfer_id']
    },
    {
      fields: ['material_id']
    }
  ]
});

export default StockTransferItem;













