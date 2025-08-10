const sequelize = require('../config/database');
const Player = require('./Player');
const Loan = require('./Loan');

function setupAssociations() {
  // A Player can be a borrower in many loans
  Player.hasMany(Loan, {
    foreignKey: 'borrowerId',
    as: 'borrowerLoans'
  });

  // A Player can be a lender in many loans
  Player.hasMany(Loan, {
    foreignKey: 'lenderId',
    as: 'lenderLoans'
  });

  // A Loan belongs to a borrower (Player)
  Loan.belongsTo(Player, {
    foreignKey: 'borrowerId',
    as: 'borrower',
    onDelete: 'CASCADE'
  });

  // A Loan belongs to a lender (Player)
  Loan.belongsTo(Player, {
    foreignKey: 'lenderId',
    as: 'lender',
    onDelete: 'CASCADE'
  });
}

// Function to clear all loan data
async function clearLoanData() {
  try {
    await Loan.destroy({ where: {}, truncate: true });
    console.log('All loan data has been cleared');
  } catch (error) {
    console.error('Error clearing loan data:', error);
    throw error;
  }
}

// Function to initialize a new game session
async function initNewGame() {
  try {
    await clearLoanData();
    console.log('New game session initialized with clean loan data');
  } catch (error) {
    console.error('Error initializing new game:', error);
    throw error;
  }
}

async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Set up model associations
    setupAssociations();

    await sequelize.sync({ alter: true });
    console.log('All models were synchronized successfully.');
    
    // Initialize a clean game state
    await initNewGame();

  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}

module.exports = initDatabase; 