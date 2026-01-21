import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PurchaseOrderItem = sequelize.define('purchase_order_item', {
  item_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  po_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to purchase order'
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
    comment: 'Ordered quantity'
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Unit price'
  },
  total_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Total amount for this item (quantity * unit_price)'
  },
  uom: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'PIECE(S)',
    comment: 'Unit of measure'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional remarks'
  },
}, {
  tableName: 'purchase_order_items',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['po_id']
    },
    {
      fields: ['material_id']
    }
  ]
});

export default PurchaseOrderItem;



