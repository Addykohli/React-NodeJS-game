// server/models/Player.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Player = sequelize.define('Player', {
  socketId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
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
    type: DataTypes.ARRAY(DataTypes.INTEGER),
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
  }
});

module.exports = Player;
