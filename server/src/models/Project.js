import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Project = sequelize.define('project', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  client: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  floors: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('Planning', 'In Progress', 'Active', 'Completed', 'On Hold'),
    defaultValue: 'Planning',
  },
  value: {
    type: DataTypes.STRING(100), // Keeping as string to match "₹500 Cr" format for now, or could be DECIMAL
    allowNull: true,
  },
  manager_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID of the Project Manager'
  },
  org_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'projects',
  timestamps: true,
  underscored: true,
});

export default Project;
