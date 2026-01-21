import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';

const GIS = sequelize.define('GIS', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  lead_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true, // Each lead can only have one GIS record
    comment: 'Reference to leads table (unique_id)'
  },
  status: {
    type: DataTypes.ENUM('FEASIBLE', 'NOT_FEASIBLE', 'INCORRECT_LOCATION'),
    allowNull: false
  },
  distance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Distance in meters'
  },
  optical_type: {
    type: DataTypes.ENUM('GPON', 'EPON', 'Media convertor'),
    allowNull: true
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  gis_status_captured_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID who captured the GIS status as FEASIBLE'
  },
  gis_status_captured_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when GIS status was captured as FEASIBLE'
  },
  org_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Organization ID for multi-tenant support'
  }
}, {
  tableName: 'gis',
  timestamps: true,
  underscored: true
});

// Association with User (who captured the GIS status as FEASIBLE)
GIS.belongsTo(User, {
  foreignKey: 'gis_status_captured_by',
  as: 'gisStatusCapturedBy',
  constraints: false
});

// Association will be set up in Lead.js to avoid circular dependency

export default GIS;

