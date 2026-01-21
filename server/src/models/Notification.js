import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Notification = sequelize.define('notification', {
  notification_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'User who receives the notification'
  },
  type: {
    type: DataTypes.ENUM('INFO', 'WARNING', 'ALERT', 'SUCCESS'),
    allowNull: false,
    defaultValue: 'INFO',
    comment: 'Type of notification'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Notification title'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Notification message'
  },
  entity_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Type of entity (e.g., MaterialRequest, PurchaseOrder)'
  },
  entity_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'ID of the related entity'
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Whether the notification has been read'
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when notification was read'
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['is_read']
    },
    {
      fields: ['entity_type', 'entity_id']
    },
    {
      fields: ['created_at']
    }
  ]
});

export default Notification;



