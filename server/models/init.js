const sequelize = require('../config/database');
const Player = require('./Player');
const GameSession = require('./GameSession');
const Loan = require('./Loan');
const setupAssociations = require('./associations');

async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Set up model associations
    setupAssociations();

    await sequelize.sync({ alter: true });
    console.log('All models were synchronized successfully.');

  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}

module.exports = initDatabase; 