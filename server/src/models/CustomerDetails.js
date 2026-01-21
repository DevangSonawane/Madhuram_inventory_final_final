import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Lead from './Lead.js';

const CustomerDetails = sequelize.define('CustomerDetails', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  lead_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    comment: 'Foreign key to leads table'
  },
  // Basic Details
  first_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  alternate_phone: {
    type: DataTypes.STRING(15),
    allowNull: true
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    allowNull: true
  },
  // Contact Details (excluding CAF No, MAC Binding, VLAN Binding, Auto Generated Password)
  contact_phone: {
    type: DataTypes.STRING(15),
    allowNull: true
  },
  contact_email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // Present Address Details
  present_address_line1: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  present_address_line2: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  present_city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  present_state: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  present_pincode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  present_country: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'India'
  },
  // Payment Address Details
  payment_address_same_as_present: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  payment_address_line1: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  payment_address_line2: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  payment_city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  payment_state: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  payment_pincode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  payment_country: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'India'
  },
  // Customer Geo Location
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    comment: 'Latitude for customer location'
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    comment: 'Longitude for customer location'
  },
  // Plan Details
  plan_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Reference to plan master table (mock data for now)'
  },
  // Requirements
  static_ip_required: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Static IP requirement: yes/no'
  },
  telephone_line_required: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Telephone Line requirement: yes/no'
  },
  org_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Organization ID for multi-tenant support'
  }
}, {
  tableName: 'customer_details',
  timestamps: true,
  underscored: true
});

// Association with Lead
CustomerDetails.belongsTo(Lead, {
  foreignKey: 'lead_id',
  as: 'lead',
  constraints: false
});

Lead.hasOne(CustomerDetails, {
  foreignKey: 'lead_id',
  as: 'customerDetails',
  constraints: false
});

export default CustomerDetails;

