import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Group = sequelize.define('group', {
  group_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  group_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Name of the group'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of the group'
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
  tableName: 'groups',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['group_name']
    },
    {
      fields: ['org_id']
    }
  ]
});

export default Group;

