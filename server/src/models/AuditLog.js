import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AuditLog = sequelize.define('audit_log', {
  audit_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  entity_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Type of entity (e.g., Material, InwardEntry)'
  },
  entity_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'ID of the entity'
  },
  action: {
    type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'ALLOCATE', 'TRANSFER', 'CONSUME', 'RETURN'),
    allowNull: false,
    comment: 'Action performed'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User who performed the action'
  },
  changes: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Before/after values for updates'
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP address of the user'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User agent string'
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Timestamp of the action'
  }
}, {
  tableName: 'audit_logs',
  timestamps: false, // We use timestamp field instead
  underscored: true,
  indexes: [
    {
      fields: ['entity_type', 'entity_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['action']
    },
    {
      fields: ['timestamp']
    }
  ]
});

export default AuditLog;



