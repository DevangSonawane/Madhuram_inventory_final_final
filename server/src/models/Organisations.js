import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js'; // your Sequelize instance

const Organization = sequelize.define('organization', {
  org_id: {
    type: DataTypes.UUID,       // using UUID for unique multi-tenant org id
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subdomain: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,                // ensures subdomain is unique per org
  },
  logo_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  theme: {
    type: DataTypes.JSON,        // can store multiple theme configurations
    allowNull: true,
  },
  created_by: {
    type: DataTypes.UUID,        // store user id who created
    allowNull: false,
  },
  updated_by: {
    type: DataTypes.UUID,        // store user id who updated last
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'organizations',
  timestamps: true,              // automatically adds createdAt and updatedAt
  underscored: true,             // created_at instead of createdAt
});

export default Organization;
