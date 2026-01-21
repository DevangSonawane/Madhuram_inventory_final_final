import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FAQ = sequelize.define('FAQ', {
  faq_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  answer: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  keywords: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON array for search',
    get() {
      const value = this.getDataValue('keywords');
      if (!value) return [];
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    },
    set(value) {
      this.setDataValue('keywords', Array.isArray(value) ? JSON.stringify(value) : value);
    }
  },
  view_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  helpful_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  not_helpful_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'faqs',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['category']
    },
    {
      fields: ['is_active']
    }
  ]
});

export default FAQ;

