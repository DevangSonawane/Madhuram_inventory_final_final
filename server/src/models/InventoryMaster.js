import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/database.js';

const InventoryMaster = sequelize.define('inventory_master', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  material_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to material'
  },
  serial_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Serial number (if applicable, must be unique)'
  },
  mac_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'MAC ID (if applicable, must be unique)'
  },
  current_location_type: {
    type: DataTypes.ENUM('WAREHOUSE', 'PERSON', 'CONSUMED'),
    allowNull: false,
    defaultValue: 'WAREHOUSE',
    comment: 'Current location type: WAREHOUSE, PERSON, or CONSUMED'
  },
  location_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Stock Area ID (UUID) or User ID (INTEGER) depending on location_type'
  },
  ticket_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Linked ticket/work order ID if in PERSON stock (e.g., TKT-55S)'
  },
  status: {
    type: DataTypes.ENUM('AVAILABLE', 'FAULTY', 'ALLOCATED', 'IN_TRANSIT', 'CONSUMED'),
    allowNull: false,
    defaultValue: 'AVAILABLE',
    comment: 'Current status of the item'
  },
  inward_item_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Which inward_item created this inventory entry'
  },
  org_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Organization ID for multi-tenant support'
  },
}, {
  tableName: 'inventory_master',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['material_id']
    },
    {
      unique: true,
      fields: ['serial_number'],
      name: 'unique_serial_number',
      where: {
        serial_number: { [Op.ne]: null }
      }
    },
    {
      unique: true,
      fields: ['mac_id'],
      name: 'unique_mac_id',
      where: {
        mac_id: { [Op.ne]: null }
      }
    },
    {
      fields: ['current_location_type', 'location_id'],
      name: 'idx_location'
    },
    {
      fields: ['ticket_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['inward_item_id']
    },
    {
      fields: ['org_id']
    }
  ]
});

export default InventoryMaster;

