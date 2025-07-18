const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GameSession = sequelize.define('GameSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
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
  },
  hasStarted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isFinished: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true
});

module.exports = GameSession;
