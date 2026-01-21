import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BusinessPartner = sequelize.define('business_partner', {
  partner_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  partner_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Business partner name'
  },
  partner_type: {
    type: DataTypes.ENUM('SUPPLIER', 'FRANCHISE', 'BOTH'),
    allowNull: false,
    defaultValue: 'SUPPLIER',
    comment: 'Type of business partner'
  },
  gst_number: {
    type: DataTypes.STRING(15),
    allowNull: false,
    comment: 'GST number'
  },
  pan_card: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'PAN card number'
  },
  tan_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'TAN Number / Card (optional)'
  },
  billing_address: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Billing address'
  },
  shipping_address: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Shipping address'
  },
  same_as_billing: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Whether shipping address is same as billing address'
  },
  bank_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Bank name'
  },
  bank_account_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Bank account holder name'
  },
  ifsc_code: {
    type: DataTypes.STRING(11),
    allowNull: false,
    comment: 'IFSC code'
  },
  account_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Bank account number'
  },
  contact_first_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Contact person first name'
  },
  contact_last_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Contact person last name'
  },
  contact_designation: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Contact person designation'
  },
  contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Contact person phone number'
  },
  contact_email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Contact person email'
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Country'
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'State'
  },
  company_website: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Company website URL'
  },
  vendor_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
    comment: 'Vendor code (auto-generated or manual)'
  },
  // Legacy fields for backward compatibility
  contact_person: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Contact person name (legacy)'
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Email address (legacy)'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Phone number (legacy)'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Address (legacy)'
  },
  org_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Organization ID for multi-tenant support'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
}, {
  tableName: 'business_partners',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['partner_name']
    },
    {
      fields: ['partner_type']
    },
    {
      fields: ['org_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['vendor_code']
    },
    {
      fields: ['gst_number']
    }
  ]
});

export default BusinessPartner;



