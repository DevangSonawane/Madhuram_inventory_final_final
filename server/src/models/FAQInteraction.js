import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FAQInteraction = sequelize.define('FAQInteraction', {
  interaction_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  faq_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  action: {
    type: DataTypes.ENUM('viewed', 'clicked', 'helpful', 'not_helpful'),
    allowNull: false
  }
}, {
  tableName: 'faq_interactions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['faq_id']
    }
  ]
});

export default FAQInteraction;

