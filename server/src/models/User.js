import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcryptjs';
import Role from './Role.js';
import Module from './Module.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  employeCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
    field: 'employee_code'
  },
  phoneNumber: {
    type: DataTypes.STRING(15),
    allowNull: true,
    unique: true,
    field: 'phone_number',
    validate: {
      is: /^[0-9]{10,15}$/i
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'refresh_token'
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'roles', key: 'id' },
    onDelete: 'SET NULL',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance method to compare password
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password and refreshToken from JSON output
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  delete values.refreshToken;
  return values;
};
User.belongsTo(Role, { foreignKey: 'role_id' });
User.belongsToMany(Module, { through: 'user_modules', foreignKey: 'user_id' });
Role.hasMany(User, { foreignKey: 'role_id' });

export default User;