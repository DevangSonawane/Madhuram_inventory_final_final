const RoleModule = sequelize.define('RoleModule', {
  role_id: {
    type: DataTypes.INTEGER,
    references: { model: 'roles', key: 'id' },
    onDelete: 'CASCADE',
  },
  module_id: {
    type: DataTypes.INTEGER,
    references: { model: 'modules', key: 'id' },
    onDelete: 'CASCADE',
  }
}, {
  tableName: 'role_modules',
  timestamps: false,
});

// Associations
Role.belongsToMany(Module, { through: RoleModule, foreignKey: 'role_id' });
Module.belongsToMany(Role, { through: RoleModule, foreignKey: 'module_id' });
