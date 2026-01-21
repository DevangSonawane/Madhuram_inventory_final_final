import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LeadKyc = sequelize.define('LeadKyc', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  lead_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    comment: 'Reference to leads table (unique_id)'
  },
  id_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Type of ID proof (PAN Card, Aadhar Card, etc.)'
  },
  id_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'ID number'
  },
  id_document: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    comment: 'ID document in base64 format'
  },
  address_proof_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Type of address proof'
  },
  address_proof_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Address proof number if applicable'
  },
  address_proof_document: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    comment: 'Address proof document in base64 format'
  },
  signature: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    comment: 'Signature in base64 format'
  },
  terms_accepted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Terms and conditions acceptance'
  },
  org_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Organization ID for multi-tenant support'
  }
}, {
  tableName: 'lead_kyc',
  timestamps: true,
  underscored: true
});

// Association will be set up in Lead.js to avoid circular dependency

export default LeadKyc;

