import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';

const Survey = sequelize.define('survey', {
    serviceRating: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      likedFeatures: {
        type: DataTypes.TEXT, // can store ["Easy to use", "Fast service"]
        allowNull: true,
      },
      heardFrom: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      contactNumber: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },

}, {
    tableName: 'survey',
    timestamps: true,
});

// Association with User
Survey.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });
User.hasMany(Survey, { foreignKey: 'userId', as: 'surveys', constraints: false });

export default Survey;