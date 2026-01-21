import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const StockArea = sequelize.define('stock_area', {
  area_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  area_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Name of the stock area/location'
  },
  location_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Short code for the location'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Physical address of the stock area'
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Storage capacity (optional)'
  },
  store_keeper_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID assigned as Store Keeper'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of the stock area/warehouse'
  },
  pin_code: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Pin code of the warehouse location'
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Company name (if applicable)'
  },
  street_number_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Street number and name'
  },
  apartment_unit: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Apartment/Unit number'
  },
  locality_district: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Locality/District (if needed)'
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'City'
  },
  state_province: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'State/Province'
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Country (in all caps)'
  },
  org_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Organization ID for multi-tenant support'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'stock_areas',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['area_name']
    },
    {
      fields: ['location_code']
    },
    {
      fields: ['store_keeper_id']
    },
    {
      fields: ['org_id']
    }
  ]
});

export default StockArea;











