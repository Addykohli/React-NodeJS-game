const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Player = sequelize.define('Player', {
  socketId: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  piece: {
    type: DataTypes.STRING,
    allowNull: true
  },
  money: {
    type: DataTypes.INTEGER,
    defaultValue: 10000
  },
  properties: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  tileId: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  prevTile: {
    type: DataTypes.INTEGER,
    defaultValue: 30
  },
  ready: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  loan: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  hasMoved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  pickedRoadCash: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  hasRolled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

}, {
  timestamps: true
});

module.exports = Player;
