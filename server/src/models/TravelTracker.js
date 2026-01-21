import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';

const TravelRecord = sequelize.define('TravelRecord', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  distance_km: { type: DataTypes.FLOAT, allowNull: false },
  vehicle_type: {
    type: DataTypes.ENUM(
      'OWN_VEHICLE',
      'COLLEAGUE',
      'COMPANY_VEHICLE',
      'BIKE',
      'CAR',
      'BUS',
      'OTHER'
    ),
    allowNull: false,
  },
  route: { type: DataTypes.TEXT, allowNull: true },
  payout: { type: DataTypes.FLOAT, allowNull: false },
  started_at: { type: DataTypes.DATE, allowNull: true },
  ended_at: { type: DataTypes.DATE, allowNull: true },
  auto_ended: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'travel_records',
  timestamps: true,
});

// ✅ Association without foreign key constraint (to avoid sync issues with existing data)
TravelRecord.belongsTo(User, { foreignKey: 'user_id', as: 'user', constraints: false });
User.hasMany(TravelRecord, { foreignKey: 'user_id', as: 'travels', constraints: false });

export default TravelRecord;
