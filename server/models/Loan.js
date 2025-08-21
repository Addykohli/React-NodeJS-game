const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Loan = sequelize.define('Loan', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  returnAmount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'pending_payment', 'completed', 'rejected'),
    defaultValue: 'pending'
  },
  borrowerId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Players',
      key: 'socketId'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  lenderId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Players',
      key: 'socketId'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  borrowerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lenderName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  requestedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejectedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = Loan;
