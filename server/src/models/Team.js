import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Team = sequelize.define('team', {
  team_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'team_id', // Explicitly map to team_id column
  },
  team_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Name of the team'
  },
  group_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to group'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of the team'
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
  tableName: 'teams',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['team_name']
    },
    {
      fields: ['group_id']
    },
    {
      fields: ['org_id']
    }
  ]
});

export default Team;

