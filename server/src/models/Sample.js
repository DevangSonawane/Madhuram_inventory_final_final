import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { jsonTextField } from '../utils/jsonField.js';

const Sample = sequelize.define('Sample', {
  sample_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  building_name: DataTypes.STRING,
  site_name: DataTypes.STRING,
  location: jsonTextField(DataTypes, () => ({})),
  work_done: DataTypes.TEXT,
  item_description: jsonTextField(DataTypes, () => []),
  add_fields: jsonTextField(DataTypes, () => []),
  sample_file: DataTypes.STRING,
}, {
  tableName: 'samples',
  timestamps: true,
  underscored: true,
});

export default Sample;
