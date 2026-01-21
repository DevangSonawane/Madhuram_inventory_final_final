import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ChatConversation = sequelize.define('ChatConversation', {
  conversation_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'User who initiated the conversation'
  },
  admin_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Admin who is handling the conversation'
  },
  status: {
    type: DataTypes.ENUM('open', 'active', 'resolved', 'closed'),
    defaultValue: 'open',
    allowNull: false
  },
  last_message_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'chat_conversations',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['employee_id']
    },
    {
      fields: ['admin_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['last_message_at']
    }
  ]
});

export default ChatConversation;

