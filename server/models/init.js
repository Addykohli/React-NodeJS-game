const sequelize = require('../config/database');
const Player = require('./Player');
const GameSession = require('./GameSession');

const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected');
    
    // Sync all models
    await sequelize.sync();
    console.log('✅ Database synchronized');
  } catch (error) {
    console.error('❌ Database connection error:', error);
  }
};

module.exports = initDatabase; 