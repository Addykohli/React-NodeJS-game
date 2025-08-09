const Player = require('./Player');
const Loan = require('./Loan');

// Define associations
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

module.exports = setupAssociations;
