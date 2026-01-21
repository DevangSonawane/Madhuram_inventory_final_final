import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';
import { leadStatus } from '../utils/leadHelpers.js';
import GIS from './GIS.js';
import LeadKyc from './LeadKyc.js';

const Lead = sequelize.define('Lead', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  status: {
    type: DataTypes.ENUM(...Object.values(leadStatus)),
    allowNull: true,
    defaultValue: leadStatus.OPEN
  },
  unique_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    unique: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  phone_number: {
    type: DataTypes.STRING(15),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  source: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  sales_executive: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  service_type: {
    type: DataTypes.ENUM('SME', 'BROADBAND', 'LEASEDLINE'),
    allowNull: false
  },
  partner_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Reference to partner master table (mock data for now)'
  },
  former_isp: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  org_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Organization ID for multi-tenant support'
  }
}, {
  tableName: 'leads',
  timestamps: true,
  underscored: true
});

// Association with User (Sales Executive)
Lead.belongsTo(User, {
  foreignKey: 'sales_executive',
  as: 'salesExecutive',
  constraints: false // Set to false to avoid sync issues
});

User.hasMany(Lead, {
  foreignKey: 'sales_executive',
  as: 'leads'
});

// Association with GIS - One lead has one GIS record
Lead.hasOne(GIS, {
  foreignKey: 'lead_id',
  sourceKey: 'unique_id',
  as: 'gisRecord',
  constraints: false
});

// Define belongsTo association for reverse lookup
GIS.belongsTo(Lead, {
  foreignKey: 'lead_id',
  targetKey: 'unique_id',
  as: 'lead',
  constraints: false
});

// Association with LeadKyc - One lead has one KYC record
Lead.hasOne(LeadKyc, {
  foreignKey: 'lead_id',
  sourceKey: 'unique_id',
  as: 'kyc',
  constraints: false
});

// Define belongsTo association for reverse lookup
LeadKyc.belongsTo(Lead, {
  foreignKey: 'lead_id',
  targetKey: 'unique_id',
  as: 'lead',
  constraints: false
});

export default Lead;

