import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcryptjs';
const Expense = sequelize.define('expense', {
    amount: { type: DataTypes.FLOAT, allowNull: false },
    distanceTravelled: { 
        type: DataTypes.FLOAT,
        field: 'distance_travelled'  // maps to DB column
    },
    billImages: { 
        type: DataTypes.TEXT,
        field: 'bill_images'  // maps to DB column
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
        defaultValue: 'Pending'
    },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user: DataTypes.TEXT,
    category: {
        type: DataTypes.TEXT,
        allowNull: false
    },

}, {
    tableName: 'expense',
    timestamps: true,
});


export default Expense;