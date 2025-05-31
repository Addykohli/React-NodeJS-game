// server/models/GameSession.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GameSession = sequelize.define('GameSession', {
  players: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  currentPlayerIndex: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  moves: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
});

module.exports = GameSession;
