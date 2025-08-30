const express       = require('express');
const http          = require('http');
const cors          = require('cors');
const { Server }    = require('socket.io');
const initDatabase  = require('./models/init');
const Player        = require('./models/Player');
const GameSession   = require('./models/GameSession');
const Loan          = require('./models/Loan');
const GameEngine    = require('./game/GameEngine');
const { calculateRentMultiplier } = require('./game/RentCalculator');
const { Op } = require('sequelize');
const sequelize     = require('./config/database');
require('dotenv').config();
const { checkRedisHealth } = require('./redisHealth');

const PORT = process.env.PORT || 5000;
const app  = express();
const server = http.createServer(app);

const allowedOrigins = [
  'https://react-nodejs-game.onrender.com',
  'https://react-nodejs-game-client.onrender.com',
  'http://localhost:3000'
];

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));

const io = new Server(server, {
  cors: corsOptions
});

initDatabase()
  .then(() => {
    console.log('Database initialized');
    return sequelize.authenticate();
  })
  .then(() => {
    console.log('Database connection established successfully.');
  })
  .catch(err => {
    console.error(' Database initialization/connection error:', err);
    console.error('Full error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
      original: err.original
    });
  });

app.use(express.json());

app.get('/healthz', async (req, res) => {
  const result = await checkRedisHealth();
  if (result.healthy) {
    res.status(200).json({ redis: 'ok' });
  } else {
    res.status(500).json({ redis: 'error', error: result.error });
  }
});

const engine          = new GameEngine();
let lobbyPlayers      = [];
let hasStarted        = false;
let currentSessionId  = null;
const branchResolvers = {};
const activeRPSGames = {};
const disconnectedPlayers = new Map();
const gameEvents = [];
let activeTradeOffers = [];

// Handle player stats update from master terminal
io.on('connection', (socket) => {
  socket.on('updatePlayerStats', async ({ playerId, updates }) => {
    const transaction = await sequelize.transaction();
    try {
      // Get the current game session
      const currentSession = await GameSession.findOne({
        where: {
          hasStarted: true,
          isFinished: false
        },
        transaction
      });

      if (!currentSession) {
        throw new Error('No active game session found');
      }

      // Find the player in the database
      const player = await Player.findOne({
        where: { socketId: playerId },
        transaction
      });

      if (!player) {
        throw new Error('Player not found');
      }

      // Update player stats
      const updatedPlayer = {
        ...player.toJSON(),
        ...updates,
        // Ensure money and loan are numbers
        money: parseInt(updates.money) || player.money,
        loan: parseInt(updates.loan) || player.loan
      };

      // Convert properties to array if it's not already
      const propertiesUpdate = Array.isArray(updates.properties) 
        ? updates.properties 
        : [];
      
      console.log('=== Before Update ===');
      console.log('Game Engine Player:', {
        id: player.socketId,
        name: player.name,
        properties: player.properties || []
      });
      
      console.log('DB Player:', {
        id: player.socketId,
        name: player.name,
        properties: player.properties || []
      });
      
      console.log('Updating with properties:', {
        newProperties: propertiesUpdate
      });
      
      // Update in database
      const [updatedCount] = await Player.update(
        {
          money: updatedPlayer.money,
          loan: updatedPlayer.loan,
          properties: propertiesUpdate
        },
        { 
          where: { socketId: playerId },
          transaction
        }
      );

      if (updatedCount === 0) {
        throw new Error('Failed to update player in database');
      }
      
      // Fetch the updated player from DB to verify
      const updatedDbPlayer = await Player.findOne({ where: { socketId: playerId } });
      console.log('=== After Update ===');
      console.log('Game Engine Player:', {
        id: player.socketId,
        name: player.name,
        properties: player.properties || []
      });
      
      console.log('DB Player:', {
        id: updatedDbPlayer.socketId,
        name: updatedDbPlayer.name,
        properties: updatedDbPlayer.properties || []
      });

      // Update in game engine
      engine.session.players = engine.session.players.map(p => {
        if (p.socketId === playerId) {
          const playerUpdate = {
            ...p,
            money: updatedPlayer.money,
            loan: updatedPlayer.loan,
            properties: [...propertiesUpdate] // Ensure properties is always an array
          };
          
          return playerUpdate;
        }
        return p;
      });

      // Update in game session
      if (currentSession) {
        await GameSession.update(
          { players: engine.session.players },
          { 
            where: { id: currentSession.id },
            transaction
          }
        );
      }

      // Update in game session
      await GameSession.update(
        { players: engine.session.players },
        { where: { id: currentSession.id }, transaction }
      );

      await transaction.commit();

      // Log the action
      const playerName = engine.session.players.find(p => p.socketId === playerId)?.name || 'Unknown';
      
      // Broadcast the update to all clients
      io.emit('playerStatsUpdated', { 
        playerId,
        updates: {
          money: updatedPlayer.money,
          loan: updatedPlayer.loan
        }
      });

      // Log the game event
      const eventMessage = `[System] Updated stats for ${playerName}`;
      gameEvents.push({
        message: eventMessage,
        timestamp: new Date().toISOString()
      });
      io.emit('gameEvent', {
        message: eventMessage,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error updating player stats:', error);
      await transaction.rollback();
      socket.emit('error', { message: 'Failed to update player stats: ' + error.message });
    }
  });
});

const broadcastGameEvent = (message) => {
  gameEvents.push({
    message,
    timestamp: new Date().toISOString()
  });
  io.emit('gameEvent', {
    message,
    timestamp: new Date().toISOString()
  });
};

async function getActiveLoans(playerId) {
  return await Loan.findAll({
    where: {
      [Op.or]: [
        { borrowerId: playerId, status: 'active' },
        { lenderId: playerId, status: 'active' }
      ]
    },
    order: [['createdAt', 'DESC']]
  });
}

async function getPendingLoanRequests(playerId) {
  return await Loan.findAll({
    where: {
      lenderId: playerId,
      status: 'pending'
    },
    include: [
      {
        model: Player,
        as: 'borrower',
        attributes: ['socketId', 'name', 'money']
      }
    ],
    order: [['createdAt', 'DESC']]
  });
}

io.on('connection', socket => {
  console.log('🔌 Connected:', socket.id);
  
  socket.emit('gameEventsHistory', gameEvents);
  
  socket.on('getLoans', async () => {
    try {
      const activeLoans = await getActiveLoans(socket.id);
      const pendingRequests = await getPendingLoanRequests(socket.id);
      socket.emit('updateLoans', { activeLoans, pendingRequests });
    } catch (error) {
      console.error('Error fetching loans:', error);
      socket.emit('loanError', { message: 'Failed to load loan data' });
    }
  });
  
  socket.on('rejectLoan', async ({ loanId }) => {
    console.log(`=== REJECTING LOAN ${loanId} ===`);
    
    try {
      const loan = await Loan.findByPk(loanId);
      if (!loan) {
        console.error(`Loan ${loanId} not found`);
        socket.emit('loanError', { message: 'Loan not found' });
        return;
      }
      
      if (loan.lenderId !== socket.id) {
        console.error(`User ${socket.id} is not the lender of loan ${loanId}`);
        socket.emit('loanError', { message: 'Not authorized' });
        return;
      }
      
      if (loan.status !== 'pending') {
        console.error(`Loan ${loanId} is not pending (status: ${loan.status})`);
        socket.emit('loanError', { message: 'Loan is not pending' });
        return;
      }
      
      loan.status = 'rejected';
      await loan.save();
      
      console.log(`Loan ${loanId} rejected`);
      
      io.to(loan.borrowerId).emit('loanRejected', { 
        loanId: loan.id,
        reason: 'Loan request was rejected'
      });
      
      socket.emit('loanRejected', { 
        loanId: loan.id,
        success: true
      });
      
    } catch (error) {
      console.error('Error rejecting loan:', error);
      socket.emit('loanError', { 
        message: 'Failed to reject loan', 
        error: error.message 
      });
    }
  });
  
  socket.on('requestLoan', async ({ lenderId, amount, returnAmount }) => {
    console.log('=== NEW LOAN REQUEST ===');
    console.log(`Borrower ID: ${socket.id}`);
    console.log(`Lender ID: ${lenderId}`);
    console.log(`Amount: $${amount}, Return: $${returnAmount}`);
    
    try {
      console.log('Looking up borrower and lender in database...');
      const [borrower, lender] = await Promise.all([
        Player.findByPk(socket.id),
        Player.findByPk(lenderId)
      ]);
      
      console.log('Borrower found:', !!borrower);
      console.log('Lender found:', !!lender);
      
      if (!borrower || !lender) {
        const errorMsg = !borrower ? 'Borrower not found' : 'Lender not found';
        console.log(`Error: ${errorMsg}`);
        socket.emit('loanError', { message: errorMsg });
        return;
      }

      console.log(`Creating loan: ${borrower.name} -> ${lender.name} for $${amount}`);
      
      try {
        const loan = await Loan.create({
          amount,
          returnAmount,
          borrowerId: socket.id,
          lenderId,
          borrowerName: borrower.name,
          lenderName: lender.name,
          status: 'pending'
        });
        console.log(`✅ Loan created with ID: ${loan.id}`);
        
        const loanData = {
          id: loan.id,
          from: {
            socketId: borrower.socketId,
            name: borrower.name
          },
          amount,
          returnAmount,
          status: 'pending',
          createdAt: loan.createdAt
        };
        
        console.log('📤 Sending loanRequest to lender:', lenderId);
        console.log('Loan data being sent:', JSON.stringify(loanData, null, 2));
        
        const sockets = await io.in(lenderId).fetchSockets();
        console.log(`Lender ${lenderId} has ${sockets.length} connected sockets`);
        
        io.to(lenderId).emit('loanRequest', loanData);
        console.log('✅ loanRequest event emitted to lender');
        
        socket.emit('loanRequestSent', { success: true });
        console.log('✅ loanRequestSent event emitted to borrower');
        
      } catch (error) {
        console.error('❌ Error creating loan:', error);
        throw error;
      }

    } catch (error) {
      console.error('Error in requestLoan:', error);
      socket.emit('loanError', { message: 'Failed to process loan request' });
    }
  });
  
  socket.on('acceptLoan', async ({ loanId }) => {
    const transaction = await sequelize.transaction();
    try {
      console.log(`[LOAN] Accepting loan ${loanId}`);
      const loan = await Loan.findByPk(loanId, { transaction });
      
      if (!loan) {
        console.error(`[LOAN] Loan ${loanId} not found`);
        throw new Error('Loan not found');
      }
      
      if (loan.lenderId !== socket.id) {
        console.error(`[LOAN] Unauthorized: ${socket.id} is not the lender of loan ${loanId}`);
        throw new Error('Not authorized to accept this loan');
      }
      
      if (loan.status !== 'pending') {
        console.error(`[LOAN] Invalid status ${loan.status} for loan ${loanId}`);
        throw new Error('Invalid loan status');
      }
      
      const lender = await Player.findByPk(socket.id, { transaction });
      if (lender.money < loan.amount) {
        console.error(`[LOAN] Insufficient funds: ${lender.money} < ${loan.amount}`);
        throw new Error('Insufficient funds to approve this loan');
      }
      
      const borrower = await Player.findByPk(loan.borrowerId, { transaction });
      if (!borrower) {
        console.error(`[LOAN] Borrower ${loan.borrowerId} not found`);
        throw new Error('Borrower not found');
      }
      
      loan.status = 'active';
      loan.acceptedAt = new Date();
      await loan.save({ transaction });
      
      lender.money -= loan.amount;
      borrower.money += loan.amount;
      
      const lenderEnginePlayer = engine.getPlayer(lender.socketId);
      const borrowerEnginePlayer = engine.getPlayer(borrower.socketId);
      
      if (lenderEnginePlayer) {
        lenderEnginePlayer.money = lender.money;
        const lenderIndex = engine.session.players.findIndex(p => p.socketId === lender.socketId);
        if (lenderIndex !== -1) {
          engine.session.players[lenderIndex].money = lender.money;
        }
      }
      
      if (borrowerEnginePlayer) {
        borrowerEnginePlayer.money = borrower.money;
        const borrowerIndex = engine.session.players.findIndex(p => p.socketId === borrower.socketId);
        if (borrowerIndex !== -1) {
          engine.session.players[borrowerIndex].money = borrower.money;
        }
      }
      
      await Promise.all([
        lender.save({ transaction }),
        borrower.save({ transaction })
      ]);
      
      await transaction.commit();
      console.log(`[LOAN] Loan ${loanId} accepted successfully`);
  
      const [borrowerLoans, lenderLoans, borrowerPending, lenderPending] = await Promise.all([
        getActiveLoans(loan.borrowerId),
        getActiveLoans(loan.lenderId),
        getPendingLoanRequests(loan.borrowerId),
        getPendingLoanRequests(loan.lenderId)
      ]);
      
      const borrowerUpdate = {
        playerId: borrower.socketId,
        newMoney: borrower.money,
        loans: {
          activeLoans: borrowerLoans,
          pendingRequests: borrowerPending
        }
      };
      
      const lenderUpdate = {
        playerId: lender.socketId,
        newMoney: lender.money,
        loans: {
          activeLoans: lenderLoans,
          pendingRequests: lenderPending
        }
      };
      
      const borrowerPlayerUpdate = {
        ...borrowerUpdate,
        player: {
          socketId: borrower.socketId,
          name: borrower.name,
          money: borrower.money,
        }
      };

      const lenderPlayerUpdate = {
        ...lenderUpdate,
        player: {
          socketId: lender.socketId,
          name: lender.name,
          money: lender.money,
        }
      };

      io.to(loan.borrowerId).emit('loanAccepted', {
        loan,
        playerUpdate: borrowerPlayerUpdate,
        lenderName: lender.name,
        isBorrower: true
      });
      
      socket.emit('loanAccepted', {
        loan,
        playerUpdate: lenderPlayerUpdate,
        borrowerName: borrower.name,
        isLender: true
      });
      
      io.emit('playerMoneyUpdate', {
        playerId: borrower.socketId,
        newMoney: borrower.money,
        playerName: borrower.name
      });
      
      io.emit('playerMoneyUpdate', {
        playerId: lender.socketId,
        newMoney: lender.money,
        playerName: lender.name
      });
      
      io.to(loan.borrowerId).emit('updateLoans', {
        ...borrowerUpdate.loans,
        playerMoney: borrower.money
      });
      
      socket.emit('updateLoans', {
        ...lenderUpdate.loans,
        playerMoney: lender.money
      });
      
      const gameState = engine.getState();
      io.emit('gameStateUpdate', gameState);
      
      console.log('[LOAN] Game state after loan acceptance:', JSON.stringify({
        borrower: {
          id: borrower.socketId,
          name: borrower.name,
          money: borrower.money,
          loans: borrowerUpdate.loans
        },
        lender: {
          id: lender.socketId,
          name: lender.name,
          money: lender.money,
          loans: lenderUpdate.loans
        },
        gameState: gameState
      }, null, 2));
      
    } catch (error) {
      console.error('[LOAN] Error accepting loan:', error);
      try {
        if (transaction.finished !== 'commit') {
          await transaction.rollback();
          console.log('[LOAN] Transaction rolled back');
        }
      } catch (rollbackError) {
        console.error('[LOAN] Error rolling back transaction:', rollbackError);
      }
      socket.emit('loanError', { 
        message: error.message || 'Failed to accept loan',
        code: error.code
      });
    }
  });
  
  socket.on('rejectLoan', async ({ loanId }) => {
    console.log(`[LOAN] Rejecting loan ${loanId}`);
    
    try {
      const loan = await Loan.findByPk(loanId);
      
      if (!loan) {
        console.error(`[LOAN] Loan ${loanId} not found`);
        throw new Error('Loan not found');
      }
      
      if (loan.lenderId !== socket.id) {
        console.error(`[LOAN] Unauthorized: ${socket.id} is not the lender of loan ${loanId}`);
        throw new Error('Not authorized to reject this loan');
      }
      
      if (loan.status !== 'pending') {
        console.error(`[LOAN] Invalid status ${loan.status} for loan ${loanId}`);
        throw new Error('Invalid loan status');
      }
  
      loan.status = 'rejected';
      loan.rejectedAt = new Date();
      await loan.save();
      
      console.log(`[LOAN] Loan ${loanId} rejected successfully`);
      
      const [borrowerLoans, lenderLoans, borrowerPending, lenderPending] = await Promise.all([
        getActiveLoans(loan.borrowerId),
        getActiveLoans(loan.lenderId),
        getPendingLoanRequests(loan.borrowerId),
        getPendingLoanRequests(loan.lenderId)
      ]);
      
      const borrowerUpdate = {
        playerId: loan.borrowerId,
        loans: {
          activeLoans: borrowerLoans,
          pendingRequests: borrowerPending
        }
      };
      
      const lenderUpdate = {
        playerId: loan.lenderId,
        loans: {
          activeLoans: lenderLoans,
          pendingRequests: lenderPending
        }
      };
      
      io.to(loan.borrowerId).emit('loanRejected', {
        loan,
        playerUpdate: borrowerUpdate,
        lenderName: loan.lenderName
      });
      
      socket.emit('loanRejected', {
        loan,
        playerUpdate: lenderUpdate,
        borrowerName: loan.borrowerName
      });
      
      io.to(loan.borrowerId).emit('updateLoans', borrowerUpdate.loans);
      socket.emit('updateLoans', lenderUpdate.loans);
      
    } catch (error) {
      console.error('[LOAN] Error rejecting loan:', error);
      socket.emit('loanError', { 
        message: error.message || 'Failed to reject loan',
        code: error.code
      });
    }
  });
  
  socket.on('repayLoan', async ({ loanId }) => {
    console.log(`[LOAN] Repaying loan ${loanId}`);
    const transaction = await sequelize.transaction();
    
    try {
      const loan = await Loan.findByPk(loanId, { transaction });
      
      if (!loan) {
        console.error(`[LOAN] Loan ${loanId} not found`);
        throw new Error('Loan not found');
      }
      
      if (loan.borrowerId !== socket.id) {
        console.error(`[LOAN] Unauthorized: ${socket.id} is not the borrower of loan ${loanId}`);
        throw new Error('Not authorized to repay this loan');
      }
      
      if (loan.status !== 'active') {
        console.error(`[LOAN] Invalid status ${loan.status} for loan ${loanId}`);
        throw new Error('Invalid loan status');
      }
      
      const borrower = await Player.findByPk(socket.id, { transaction });
      if (borrower.money < loan.returnAmount) {
        console.error(`[LOAN] Insufficient funds: ${borrower.money} < ${loan.returnAmount}`);
        throw new Error('Insufficient funds to repay the loan');
      }
      
      const lender = await Player.findByPk(loan.lenderId, { transaction });
      if (!lender) {
        console.error(`[LOAN] Lender ${loan.lenderId} not found`);
        throw new Error('Lender not found');
      }
      
      const borrowerEnginePlayer = engine.getPlayer(borrower.socketId);
      const lenderEnginePlayer = engine.getPlayer(lender.socketId);
      
      borrower.money -= loan.returnAmount;
      lender.money += loan.returnAmount;
      
      if (borrowerEnginePlayer) borrowerEnginePlayer.money = borrower.money;
      if (lenderEnginePlayer) lenderEnginePlayer.money = lender.money;
      
      loan.status = 'completed';
      loan.completedAt = new Date();
      
      await Promise.all([
        borrower.save({ transaction }),
        lender.save({ transaction }),
        loan.save({ transaction })
      ]);
      
      await transaction.commit();
      console.log(`[LOAN] Loan ${loanId} repaid successfully`);
      
      const [borrowerLoans, lenderLoans, borrowerPending, lenderPending] = await Promise.all([
        getActiveLoans(loan.borrowerId),
        getActiveLoans(loan.lenderId),
        getPendingLoanRequests(loan.borrowerId),
        getPendingLoanRequests(loan.lenderId)
      ]);
      
      const borrowerUpdate = {
        playerId: borrower.socketId,
        newMoney: borrower.money,
        loans: {
          activeLoans: borrowerLoans,
          pendingRequests: borrowerPending
        }
      };
      
      const lenderUpdate = {
        playerId: lender.socketId,
        newMoney: lender.money,
        loans: {
          activeLoans: lenderLoans,
          pendingRequests: lenderPending
        }
      };
      
      io.to(loan.lenderId).emit('loanRepaid', {
        loan,
        playerUpdate: lenderUpdate,
        borrowerName: loan.borrowerName
      });
      
      socket.emit('loanRepaid', {
        loan,
        playerUpdate: borrowerUpdate,
        lenderName: loan.lenderName
      });
      
      io.emit('playerMoneyUpdate', {
        playerId: borrower.socketId,
        newMoney: borrower.money
      });
      
      io.emit('playerMoneyUpdate', {
        playerId: lender.socketId,
        newMoney: lender.money
      });
      
      io.to(loan.borrowerId).emit('updateLoans', borrowerUpdate.loans);
      io.to(loan.lenderId).emit('updateLoans', lenderUpdate.loans);
      
      io.emit('gameStateUpdate', engine.getState());
      
    } catch (error) {
      console.error('[LOAN] Error repaying loan:', error);
      try {
        if (transaction.finished !== 'commit') {
          await transaction.rollback();
          console.log('[LOAN] Transaction rolled back');
        }
      } catch (rollbackError) {
        console.error('[LOAN] Error rolling back transaction:', rollbackError);
      }
      socket.emit('loanError', { 
        message: error.message || 'Failed to repay loan',
        code: error.code
      });
    }
  });

  socket.on('joinLobby', async ({ name }) => {
    console.log('[joinLobby] name:', name);
    
    const isNameTaken = lobbyPlayers.some(p => 
      p.name.toLowerCase() === name.toLowerCase() && 
      p.socketId !== socket.id &&
      !disconnectedPlayers.has(name)
    );
    
    if (isNameTaken) {
      socket.emit('joinError', { 
        message: 'This name is already taken. Please choose another name.' 
      });
      return;
    }
    
    if (hasStarted) {
      console.log('=== PLAYER STATES ===');
      const allPlayers = await Player.findAll();
      allPlayers.forEach(player => {
        console.log(`\nPlayer: ${player.name} (${player.socketId})`);
        console.log('------------------------');
        console.log(`- Piece: ${player.piece}`);
        console.log(`- Money: $${player.money}`);
        console.log(`- Tile ID: ${player.tileId}`);
        console.log(`- Previous Tile: ${player.prevTile}`);
        console.log(`- Loan: $${player.loan}`);
        console.log(`- Has Moved: ${player.hasMoved}`);
        console.log(`- Has Rolled: ${player.hasRolled}`);
        console.log(`- Picked Road Cash: ${player.pickedRoadCash}`);
        console.log(`- Ready: ${player.ready}`);
        console.log(`- Properties: ${JSON.stringify(player.properties, null, 2)}`);
      });
      console.log('======================');
      const disconnectedPlayer = disconnectedPlayers.get(name);
      if (disconnectedPlayer) {
        const oldSocketId = disconnectedPlayer.socketId;

        try {
          const playerState = await Player.findOne({
            where: { socketId: oldSocketId }
          });
          
          if (playerState) {
            await Player.update(
              { 
                socketId: socket.id,
              },
              { where: { socketId: oldSocketId } }
            );

            engine.session.players = engine.session.players.map(p =>
              p.socketId === oldSocketId ? {
                ...playerState.get(),  
                socketId: socket.id,
              } : p
            );
            
            lobbyPlayers = lobbyPlayers.map(p =>
              p.socketId === oldSocketId ? {
                ...playerState.get(),  
                socketId: socket.id,
              } : p
            );

            disconnectedPlayer.socketId = socket.id;
            disconnectedPlayer.hasMoved = playerState.hasMoved;
            disconnectedPlayer.money = playerState.money;
            disconnectedPlayer.properties = playerState.properties;
            disconnectedPlayer.loan = playerState.loan;
            disconnectedPlayer.piece = playerState.piece;
            disconnectedPlayer.tileId = playerState.tileId;
            disconnectedPlayer.prevTile = playerState.prevTile;
          }
        } catch (err) {
          console.error('Error restoring player state:', err);
        }

        disconnectedPlayers.delete(name);

        const isCurrentPlayer = engine.session.players[engine.session.currentPlayerIndex].socketId === socket.id;
        
        socket.emit('gameStart', {
          players: engine.session.players,
          sessionId: currentSessionId,
          currentPlayerId: engine.session.players[engine.session.currentPlayerIndex].socketId
        });

        io.emit('lobbyUpdate', lobbyPlayers);
        
        const currentPlayer = engine.getPlayer(socket.id);
        if (currentPlayer) {
          socket.emit('playerMoved', {
            playerId: socket.id,
            tileId: currentPlayer.tileId,
            hasMoved: currentPlayer.hasMoved 
          });
          
          if (!isCurrentPlayer || currentPlayer.hasMoved) {
            socket.emit('movementDone');
          }
        }
        return;
      }
      return;
    }

    try {
      const playerData = {
        socketId: socket.id,
        name,
        ready: false,
        money: 10000,
        properties: [],
        tileId: 1,
        prevTile: 30,
        piece: null,
        loan: 0,
        hasMoved: false
      };

      await Player.create(playerData);
      lobbyPlayers.push(playerData);
      engine.addPlayer(playerData);
      io.emit('lobbyUpdate', lobbyPlayers);
    } catch (err) {
      console.error('Error creating new player:', err);
      socket.emit('joinError', { message: 'Error joining game. Please try again.' });
    }
  });

  socket.on('selectPiece', ({ piece }) => {
    console.log('[selectPiece] piece:', piece);
    const p = lobbyPlayers.find(x => x.socketId === socket.id);
    if (!p) return;
    p.piece = piece;
    io.emit('lobbyUpdate', lobbyPlayers);
  });

  socket.on('playerReady', async () => {
    console.log('[playerReady] socket:', socket.id);
    const p = lobbyPlayers.find(x => x.socketId === socket.id);
    if (!p || p.ready) return;
    p.ready = true;
    io.emit('lobbyUpdate', lobbyPlayers);

    const allReady = lobbyPlayers.length >= 2 && lobbyPlayers.every(x => x.ready && x.piece);
    if (!hasStarted && allReady) {
      console.log('All players ready, starting game');
      hasStarted = true;
      const arr = [...lobbyPlayers];
      const i   = Math.floor(Math.random() * arr.length);
      if (i > 0) arr.unshift(arr.splice(i, 1)[0]);
      lobbyPlayers = arr;
      engine.session.players = arr;
      engine.session.currentPlayerIndex = 0;

      try {
        const allPlayers = await Player.findAll();
        const lobbyPlayerIds = arr.map(p => p.socketId);
        const playersToRemove = allPlayers.filter(p => !lobbyPlayerIds.includes(p.socketId));
        
        if (playersToRemove.length > 0) {
          console.log(`Cleaning up ${playersToRemove.length} players not in the current lobby:`);
          for (const player of playersToRemove) {
            console.log(`- ${player.name} (${player.socketId})`);
            await player.destroy();
          }
        }
      } catch (error) {
        console.error('Error cleaning up players:', error);
      }

      const s = new GameSession({
        players: arr.map(pl => ({
          socketId: pl.socketId,
          name:     pl.name,
          piece:    pl.piece,
          money:    pl.money,
          properties: pl.properties,
          tileId:   pl.tileId,
          prevTile: pl.prevTile,
          ready:    pl.ready
        })),
        currentPlayerIndex: 0,
        history: []
      });
      await s.save();
      currentSessionId = s._id;

      io.emit('gameStart', { players: arr, sessionId: currentSessionId, currentPlayerId: arr[0].socketId });
    }
  });

  socket.on('rollDice', async ({ testRoll }) => {
    console.log('[rollDice] for', socket.id);
    let currentPlayer = engine.getPlayer(socket.id);
    if (!currentPlayer) return;
    if (currentPlayer.hasRolled) {
      console.log('Player has already moved this turn');
      return;
    }

    let roll;
    if (testRoll) {
      roll = { die1: Math.ceil(testRoll/2), die2: Math.floor(testRoll/2), total: testRoll };
    } else {
      roll = engine.rollDice(socket.id);
    }
    console.log('Dice rolled:', roll.die1, roll.die2, 'total:', roll.total);

    currentPlayer.hasRolled = true;
    try {
      const transaction = await sequelize.transaction();
      await Player.update(
        { hasRolled: true },
        { where: { socketId: socket.id }, transaction }
      );
      engine.session.players = engine.session.players.map(p =>
        p.socketId === socket.id ? { ...p, hasRolled: true } : p
      );
      if (currentSessionId) {
        await GameSession.update(
          { players: engine.session.players },
          { where: { id: currentSessionId }, transaction }
        );
      }
      await transaction.commit();
      
    } catch (err) {
      console.error('Error updating hasRolled state:', err);
    }

    io.emit('playersStateUpdate', {
      players: engine.session.players
    });
    io.emit('diceResult', {
      playerId: socket.id,
      die1: roll.die1,
      die2: roll.die2,
      total: roll.total
    });
    io.emit('playerMoved', {
      playerId: socket.id,
      tileId: currentPlayer.tileId,
      hasMoved: currentPlayer.hasMoved,
      hasRolled: true
    });

    let remaining = roll.total;
    let passedStart = false;

    while (remaining > 0) {
      const step = engine.moveOneStep(socket.id, roll.total);
      if (!step) break;

      currentPlayer = engine.getPlayer(socket.id);
      if (step.branchChoices) {
        console.log('Branch choices:', step.branchChoices);
        socket.emit('branchChoices', { options: step.branchChoices.map(c => c.to) });
        const idx = await new Promise(res => branchResolvers[socket.id] = res);
        console.log('Branch selected index:', idx);
        const to = engine.chooseBranch(socket.id, step.branchChoices, idx);

        currentPlayer = engine.getPlayer(socket.id);

        io.emit('playerMoved', { playerId: socket.id, tileId: currentPlayer.tileId, hasMoved: currentPlayer.hasMoved });

      } else {
        const newTile = currentPlayer.tileId;
        const prevTile = currentPlayer.prevTile;
        console.log('Moved from tile', prevTile, 'to tile:', newTile);

        if (newTile === 1 && !passedStart) {
          const bonusAmount = currentPlayer.loan > 0 ? 4000 : 5000;
          console.log('Player landed on start! Awarding bonus.', {
            hasLoan: currentPlayer.loan > 0,
            bonusAmount,
            currentLoan: currentPlayer.loan
          });
          
          const transaction = await sequelize.transaction();

          try {
            currentPlayer.money += bonusAmount;
            passedStart = true; 
            
            await Player.update(
              { money: currentPlayer.money },
              { where: { socketId: socket.id }, transaction }
            );

            engine.session.players = engine.session.players.map(p =>
              p.socketId === socket.id ? { ...p, money: currentPlayer.money } : p
            );
            if (currentSessionId) {
              await GameSession.update(
                { players: engine.session.players },
                { where: { id: currentSessionId }, transaction }
              );
            }

            engine.session.players = engine.session.players.map(p => {
              if (p.socketId === currentPlayer.socketId) {
                return { 
                  ...p, 
                  money: currentPlayer.money 
                };
              }
              return p;
            });
            
            if (currentSessionId) {
              await GameSession.update(
                { players: engine.session.players },
                { 
                  where: { id: currentSessionId },
                  transaction 
                }
              );
            }

            await transaction.commit();

            io.emit('startBonus', {
              playerSocketId: socket.id,
              newMoney: currentPlayer.money,
              amount: bonusAmount,
              reason: 'landing on'
            });

            const playerName = engine.getPlayer(socket.id).name;
            broadcastGameEvent(`${playerName} received $${bonusAmount} for landing on Start!`);

          } catch (err) {
            await transaction.rollback();
            console.error('Error processing start bonus:', err);
          }
        }
        else if (prevTile === 30 && newTile > 1 && !passedStart) {
          const bonusAmount = currentPlayer.loan > 0 ? 4000 : 5000;
          console.log('Player passed through start! Awarding bonus.', {
            hasLoan: currentPlayer.loan > 0,
            bonusAmount,
            currentLoan: currentPlayer.loan
          });
          currentPlayer.money += bonusAmount;
          passedStart = true;
          
          try {
            const transaction = await sequelize.transaction();
            try {
              await Player.update(
                { money: currentPlayer.money },
                { where: { socketId: socket.id }, transaction }
              );
              
              if (currentSessionId) {
                await GameSession.update(
                  { players: engine.session.players },
                  { where: { id: currentSessionId }, transaction }
                );
              }

              engine.session.players = engine.session.players.map(p => {
                if (p.socketId === currentPlayer.socketId) {
                  return { 
                    ...p, 
                    money: currentPlayer.money 
                  };
                }
                return p;
              });

              await transaction.commit();
              
              io.emit('startBonus', {
                playerSocketId: socket.id,
                newMoney: currentPlayer.money,
                amount: bonusAmount,
                reason: 'passing through'
              });
            } catch (err) {
              await transaction.rollback();
              console.error('Error processing start bonus:', err);
            }
          } catch (err) {
            console.error('Error starting transaction:', err);
          }
        }

        currentPlayer.pickedRoadCash = false;
        console.log("pickedRoadCash:", currentPlayer.pickedRoadCash);
        

        io.emit('playerMoved', { playerId: socket.id, tileId: currentPlayer.tileId, hasMoved: currentPlayer.hasMoved });
      }

      if (currentSessionId) {
        const from = engine.getPlayer(socket.id).prevTile;
        const to   = engine.getPlayer(socket.id).tileId;
        await GameSession.findByIdAndUpdate(currentSessionId, {
          $push: { moves: { playerSocketId: socket.id, die1: roll.die1, die2: roll.die2, fromTile: from, toTile: to } }
        });
      }

      remaining--;
      await new Promise(r => setTimeout(r, 500));
    }
    const { tiles } = require('./data/tiles.cjs');
    const finalPlayer = engine.getPlayer(socket.id);
    const finalTileId = finalPlayer.tileId;

    if (finalTileId !== 7) {  
      const playersOnTile = engine.session.players.filter(p => 
        p.tileId === finalTileId && 
        p.socketId !== socket.id  
      );

      if (playersOnTile.length > 0) {
        const tile = tiles.find(t => t.id === finalTileId);
        const tileOwner = engine.session.players.find(p => 
          p.properties && p.properties.includes(finalTileId)
        );

        for (const targetPlayer of playersOnTile) {
          if (tileOwner && targetPlayer.socketId === tileOwner.socketId) {
            console.log(`Skipping stomp - target player owns the property`);
            continue;
          }

          const stompAmount = 2000;
          let transaction;
          
          try {
            transaction = await sequelize.transaction();
            const amountPaid = Math.min(targetPlayer.money, stompAmount);
            const loanIncrease = Math.max(0, stompAmount - amountPaid);
            
            targetPlayer.money -= amountPaid;
            if (loanIncrease > 0) {
              targetPlayer.loan = (targetPlayer.loan || 0) + loanIncrease;
            }
            
            finalPlayer.money += stompAmount;
            
            console.log(`Stomp: $${amountPaid} transferred from ${targetPlayer.name} to ${finalPlayer.name}` + 
                       (loanIncrease > 0 ? ` and $${loanIncrease} added to ${targetPlayer.name}'s loan` : ''));
            
            await Player.update(
              { 
                money: targetPlayer.money,
                loan: targetPlayer.loan || 0
              },
              { 
                where: { socketId: targetPlayer.socketId },
                transaction 
              }
            );
            
            await Player.update(
              { money: finalPlayer.money },
              { 
                where: { socketId: finalPlayer.socketId },
                transaction 
              }
            );
            
            engine.session.players = engine.session.players.map(p => {
              if (p.socketId === targetPlayer.socketId) {
                return { 
                  ...p, 
                  money: targetPlayer.money, 
                  loan: targetPlayer.loan || 0 
                };
              }
              if (p.socketId === finalPlayer.socketId) {
                return { 
                  ...p, 
                  money: finalPlayer.money 
                };
              }
              return p;
            });
            
            if (currentSessionId) {
              await GameSession.update(
                { players: engine.session.players },
                { 
                  where: { id: currentSessionId },
                  transaction 
                }
              );
            }
            
            await transaction.commit();
            
            io.emit('playerMoneyUpdate', {
              playerId: targetPlayer.socketId,
              newBalance: targetPlayer.money,
              loan: targetPlayer.loan || 0
            });
            
            io.emit('playerMoneyUpdate', {
              playerId: finalPlayer.socketId,
              newBalance: finalPlayer.money
            });
            
            let message = `${finalPlayer.name} stomped on ${targetPlayer.name} and collected $2000!`;
            broadcastGameEvent(message);
            
          } catch (err) {
            if (transaction && !transaction.finished) {
              await transaction.rollback();
            }
            console.error('Error processing stomp payment:', err);
            broadcastGameEvent(`Error processing stomp payment between ${finalPlayer.name} and ${targetPlayer.name}.`);
            throw err;
          }
        }
      }
    }

    if (finalTileId <= 30) {
      finalPlayer.prevTile = finalTileId === 1 ? 30 : finalTileId - 1;
      
      try {
        const transaction = await sequelize.transaction();
        await Player.update(
          { prevTile: finalPlayer.prevTile },
          { 
            where: { socketId: socket.id },
            transaction
          }
        );

        
        if (currentSessionId) {
          await GameSession.update(
            { players: engine.session.players },
            { where: { id: currentSessionId }, transaction }
          );
        }

        await transaction.commit();
      } catch (err) {
        console.error('Error updating player state:', err);
      }
    }
    const finalTile = tiles.find(t => t.id === finalTileId);
    
    console.log('Final position for rent check:', { 
      playerId: socket.id,
      tileId: finalTileId,
      tileName: finalTile?.name,
      tileType: finalTile?.type
    });


    
    if (finalTile?.name === 'RPS') {
      console.log('\nLanded on RPS! Finding shortest paths to other players...');
      const pathInfo = engine.findShortestPathsToPlayers(finalTileId);
      
      
      if (pathInfo.closestPlayers.length > 0) {
        const gameId = Date.now();
        const closestPlayers = pathInfo.closestPlayers.map(playerName => {
          return engine.session.players.find(p => p.name === playerName);
        }).filter(Boolean);
        
        activeRPSGames[gameId] = {
          landingPlayer: currentPlayer,
          closestPlayers: closestPlayers,
          choices: {}, 
          winners: [], 
          ties: [], 
          losers: [] 
        };

        io.emit('stonePaperScissorsStart', {
          landingPlayer: currentPlayer,
          closestPlayers: closestPlayers,
          gameId: gameId
        });
      }
    }

    if (finalTile?.type === 'property') {
      // Ensure consistent types by converting both to string for comparison
      const currentPlayerProperties = (currentPlayer.properties || []).map(String);
      const isOwnedByCurrentPlayer = currentPlayerProperties.includes(String(finalTile.id));
      
      const propertyOwner = engine.session.players.find(p => 
        p.socketId !== socket.id && 
        (p.properties || []).map(String).includes(String(finalTile.id))
      );

      console.log('[DEBUG] Property ownership check:', {
        tileId: finalTile.id,
        tileName: finalTile.name,
        isOwnedByCurrentPlayer,
        isOwnedByOther: !!propertyOwner,
        ownerName: propertyOwner?.name,
        currentPlayerMoney: currentPlayer.money,
        ownerMoney: propertyOwner?.money,
        currentPlayerProperties: currentPlayer.properties,
        ownerProperties: propertyOwner?.properties
      });

      if (propertyOwner && !isOwnedByCurrentPlayer) {
        const rentMultiplier = calculateRentMultiplier(finalTile.id, propertyOwner.properties);
        const baseRent = finalTile.rent;
        const finalRent = baseRent * rentMultiplier;
        const transaction = await sequelize.transaction();

        try {
        currentPlayer.money -= finalRent;
        propertyOwner.money += finalRent;

          if (currentPlayer.money < 0) {
            const loanIncrease = Math.abs(currentPlayer.money);
            currentPlayer.loan = (currentPlayer.loan || 0) + loanIncrease;
            currentPlayer.money = 0;
          }

          await Player.update(
            { money: currentPlayer.money, loan: currentPlayer.loan, hasRolled: true },
            { where: { socketId: currentPlayer.socketId }, transaction }
          );

          await Player.update(
            { money: propertyOwner.money },
            { where: { socketId: propertyOwner.socketId }, transaction }
          );

          engine.session.players = engine.session.players.map(p => {
            if (p.socketId === currentPlayer.socketId) {
              return { ...p, money: currentPlayer.money, loan: currentPlayer.loan, hasRolled: true };
            }
            if (p.socketId === propertyOwner.socketId) {
              return { ...p, money: propertyOwner.money };
            }
            return p;
          });

          if (currentSessionId) {
            await GameSession.update(
              { players: engine.session.players },
              { where: { id: currentSessionId }, transaction }
            );
          }
          await transaction.commit();

          io.emit('rentPaid', {
            payerSocketId: currentPlayer.socketId,
            payerMoney: currentPlayer.money,
            payerLoan: currentPlayer.loan,
            ownerSocketId: propertyOwner.socketId,
            ownerMoney: propertyOwner.money,
            amount: finalRent,
            baseRent: baseRent,
            multiplier: rentMultiplier,
            propertyName: finalTile.name
          });

          const payer = engine.getPlayer(currentPlayer.socketId);
          const owner = engine.getPlayer(propertyOwner.socketId);
          const message = `${payer.name} paid $${finalRent} rent to ${owner.name} for ${finalTile.name}. ${payer.name} now has $${payer.money}${payer.loan ? ` and $${payer.loan} loan` : ''}.`;
          broadcastGameEvent(message);

        } catch (err) {
          await transaction.rollback();
          console.error('Error processing rent payment:', err);
        }
      } else if (isOwnedByCurrentPlayer) {
        const rentMultiplier = calculateRentMultiplier(finalTile.id, currentPlayer.properties);
        const baseRent = finalTile.rent;
        const bonus = baseRent * rentMultiplier;

        const transaction = await sequelize.transaction();

        try {
          currentPlayer.money += bonus;

          await Player.update(
            { money: currentPlayer.money, hasRolled: true },
            { where: { socketId: currentPlayer.socketId }, transaction }
          );

          engine.session.players = engine.session.players.map(p =>
            p.socketId === currentPlayer.socketId ? { ...p, money: currentPlayer.money, hasRolled: true } : p
          );

          if (currentSessionId) {
            await GameSession.update(
              { players: engine.session.players },
              { where: { id: currentSessionId }, transaction }
            );
          }

          await transaction.commit();

          io.emit('rentBonus', {
            playerSocketId: currentPlayer.socketId,
            newMoney: currentPlayer.money,
            amount: bonus,
            propertyName: finalTile.name
          });

          const player = engine.getPlayer(currentPlayer.socketId);
          broadcastGameEvent(`${player.name} received $${bonus} bonus from their property ${finalTile.name}!`);

        } catch (err) {
          await transaction.rollback();
          console.error('Error processing rent bonus:', err);
        }
      }
    }

    console.log('Emitting movementDone for', socket.id);
    const rollingPlayer = engine.getPlayer(socket.id);
    rollingPlayer.hasMoved = true;
    try {
      const transaction = await sequelize.transaction();
      await Player.update(
        { hasMoved: true },
        { where: { socketId: socket.id }, transaction }
      );
      engine.session.players = engine.session.players.map(p =>
        p.socketId === socket.id ? { ...p, hasMoved: true } : p
      );
      if (currentSessionId) {
        await GameSession.update(
          { players: engine.session.players },
          { where: { id: currentSessionId }, transaction }
        );
      }
      await transaction.commit();
    } catch (err) {
      console.error('Error updating hasMoved state:', err);
    }
    io.emit('playersStateUpdate', {
      players: engine.session.players
    });
    socket.emit('movementDone');
  });

  socket.on('branchChoice', idx => {
    console.log('[branchChoice] idx:', idx);
    const fn = branchResolvers[socket.id];
    if (fn) { fn(idx); delete branchResolvers[socket.id]; }
  });

  socket.on('endTurn', async () => {
    console.log('[endTurn] for', socket.id);
    const endingPlayer = engine.getPlayer(socket.id);
    endingPlayer.hasRolled = false; 

    try {
      const transaction = await sequelize.transaction();
      await Player.update(
        { hasRolled: false },
        { where: { socketId: socket.id }, transaction }
      );
      engine.session.players = engine.session.players.map(p =>
        p.socketId === socket.id ? { ...p, hasRolled: false } : p
      );
      if (currentSessionId) {
        await GameSession.update(
          { players: engine.session.players },
          { where: { id: currentSessionId }, transaction }
        );
      }
      await transaction.commit();
      
    } catch (err) {
      console.error('Error updating hasRolled state:', err);
    }

    if (endingPlayer) {
      endingPlayer.hasMoved = false;
      endingPlayer.pickedRoadCash = true; 
      console.log("pickedRoadCash:", endingPlayer.pickedRoadCash);
    }
    else {
      console.log('Player not found for endTurn:', socket.id);
    }
    const next = engine.endTurn();
    console.log('Next player:', next);
    io.emit('turnEnded', { nextPlayerId: next });
    if (currentSessionId) {
      await GameSession.findByIdAndUpdate(currentSessionId, { currentPlayerIndex: engine.session.currentPlayerIndex });
    }
  });

  socket.on('buyProperty', async () => {
    console.log('[buyProperty] received from', socket.id);
    
    try {
      const playerObj = engine.getPlayer(socket.id);
      if (!playerObj) {
        console.log('purchaseFailed: playerNotFound');
        return socket.emit('purchaseFailed', { reason: 'playerNotFound' });
      }
      console.log('PlayerObj:', playerObj);

      const { tiles } = require('./data/tiles.cjs');
      const tile = tiles.find(t => t.id === playerObj.tileId);

      if (!tile || tile.type !== 'property') {
        console.log('purchaseFailed: notProperty');
        return socket.emit('purchaseFailed', { reason: 'notProperty' });
      }

      const isOwnedByAnyPlayer = engine.session.players.some(p => p.properties.includes(tile.id));
      if (isOwnedByAnyPlayer) {
        console.log('purchaseFailed: alreadyOwned');
        return socket.emit('purchaseFailed', { reason: 'alreadyOwned' });
      }

      if (playerObj.money < tile.cost) {
        console.log('purchaseFailed: insufficientFunds');
        return socket.emit('purchaseFailed', { reason: 'insufficientFunds' });
      }

      const transaction = await sequelize.transaction();

      try {
        const dbPlayer = await Player.findOne({ where: { socketId: socket.id }, transaction, lock: transaction.LOCK.UPDATE });
        if (!dbPlayer) {
          await transaction.rollback();
          return socket.emit('purchaseFailed', { reason: 'playerNotFound' });
        }
        const dbProperties = Array.isArray(dbPlayer.properties) ? dbPlayer.properties : [];
        if (dbProperties.includes(tile.id)) {
          await transaction.rollback();
          console.log('purchaseFailed: alreadyOwned (db check)');
          return socket.emit('purchaseFailed', { reason: 'alreadyOwned' });
        }
        if (dbPlayer.money < tile.cost) {
          await transaction.rollback();
          console.log('purchaseFailed: insufficientFunds (db check)');
          return socket.emit('purchaseFailed', { reason: 'insufficientFunds' });
        }

        const newMoney = dbPlayer.money - tile.cost;
        if (newMoney < 0) {
          await transaction.rollback();
          console.log('purchaseFailed: insufficientFunds (would go negative)');
          return socket.emit('purchaseFailed', { reason: 'insufficientFunds' });
        }
        const newProperties = [...dbProperties, tile.id];

        const updatedPlayer = await Player.update(
          {
            money: newMoney,
            properties: newProperties
          },
          {
            where: { socketId: socket.id },
            returning: true,
            transaction
          }
        );

        if (!updatedPlayer[0]) {
          await transaction.rollback();
          throw new Error('Failed to update player');
        }

        playerObj.money = newMoney;
        playerObj.properties = newProperties;

        if (currentSessionId) {
          console.log('Updating GameSession', currentSessionId);
          await GameSession.update(
            {
              players: engine.session.players.map(p => ({
                socketId: p.socketId,
                name: p.name,
                piece: p.piece,
                money: p.money,
                properties: p.properties,
                tileId: p.tileId,
                prevTile: p.prevTile,
                ready: p.ready
              }))
            },
            {
              where: { id: currentSessionId },
              transaction
            }
          );
        }

        await transaction.commit();

        broadcastGameEvent(`${playerObj.name} bought ${tile.name} for $${tile.cost}`);

        console.log('purchaseSuccess emit');
        io.emit('purchaseSuccess', {
          socketId: socket.id,
          money: playerObj.money,
          properties: playerObj.properties
        });
      } catch (err) {
        await transaction.rollback();
        console.error('Transaction error:', err);
        console.error('Full error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack,
          code: err.code,
          original: err.original
        });
        socket.emit('purchaseFailed', { reason: 'dbError' });
      }
    } catch (err) {
      console.error('Error in buyProperty:', err);
      console.error('Full error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: err.code,
        original: err.original
      });
      socket.emit('purchaseFailed', { reason: 'dbError' });
    }
  });

  socket.on('chatMessage', (message) => {
    io.emit('chatMessage', message);
  });

  socket.on('casinoRoll', async ({ betAmount, betType }) => {
    
    const player = engine.getPlayer(socket.id);
    if (!player) return;
    const transaction = await sequelize.transaction();

    try {
      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      const total = die1 + die2;
      let won = false;
      if (betType === 'above' && total > 7) won = true;
      else if (betType === 'below' && total < 7) won = true;
      else if (betType === '7' && total === 7) won = true;

      const multiplier = betType === '7' ? 3 : 2;
      const moneyChange = won ? betAmount * multiplier : -betAmount;
      player.money += moneyChange;

      if (player.money < 0) {
        const loanIncrease = Math.abs(player.money);
        player.loan = (player.loan || 0) + loanIncrease;
        player.money = 0;
      }

      await Player.update(
        { 
          money: player.money,
          loan: player.loan
        },
        { 
          where: { socketId: socket.id },
          transaction
        }
      );

      engine.session.players = engine.session.players.map(p =>
        p.socketId === socket.id ? { ...p, money: player.money, loan: player.loan } : p
      );
      if (currentSessionId) {
        await GameSession.update(
          { players: engine.session.players },
          { 
            where: { id: currentSessionId },
            transaction
          }
        );
      }

      await transaction.commit();

      io.emit('casinoResult', {
        playerId: socket.id,
        dice: [die1, die2],
        amount: Math.abs(moneyChange),
        won,
        playerMoney: player.money,
        playerLoan: player.loan,
        playerName: player.name
      });

      const resultMessage = won 
        ? `${player.name} won $${Math.abs(moneyChange)} at the casino!`
        : `${player.name} lost $${Math.abs(moneyChange)} at the casino!`;
      broadcastGameEvent(resultMessage);

      player.hasMoved = true;
      io.emit('movementDone', { playerId: socket.id });

    } catch (err) {
      await transaction.rollback();
      console.error('Error processing casino bet:', err);
    }
  });

  socket.on('landOnRoad', async () => {

    const player = engine.getPlayer(socket.id);
    if (!player) return;

    try {
      const transaction = await sequelize.transaction();

      try {
        const playerState = {
          ...player,
          hasMoved: false
        };

        await Player.update(
          { hasMoved: false },
          { 
            where: { socketId: socket.id },
            transaction
          }
        );

        if (currentSessionId) {
          await GameSession.update(
            { players: engine.session.players },
            { 
              where: { id: currentSessionId },
              transaction
            }
          );
        }

        await transaction.commit();

        io.emit('playerMoved', {
          playerId: socket.id,
          tileId: player.tileId,
          hasMoved: player.hasMoved
        });

        const amounts = [1000, 2000, 3000, 4000, 5000]
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        socket.emit('roadCashOptions', {
          amounts,
          player: playerState,
          currentPlayerId: socket.id,
          currentTile: player.tileId
        });

      } catch (err) {
        await transaction.rollback();
        console.error('Error preparing road tile event:', err);
      }
    } catch (err) {
      console.error('Error starting road tile transaction:', err);
    }
  });

  socket.on('roadCashSelected', async ({ amount }) => {
    
    const player = engine.getPlayer(socket.id);
    if (!player) return;

    try {
      const transaction = await sequelize.transaction();

      try {
        const updatedPlayerState = {
          ...player,
          money: player.money + amount,
          hasMoved: true,
        };

        await Player.update(
          { 
            money: updatedPlayerState.money,
            hasMoved: true
          },
          { 
            where: { socketId: socket.id },
            transaction
          }
        );

        player.money = updatedPlayerState.money;
        player.hasMoved = true;
        engine.session.players = engine.session.players.map(p =>
          p.socketId === socket.id ? { ...p, ...updatedPlayerState } : p
        );

        if (currentSessionId) {
          await GameSession.update(
            { players: engine.session.players },
            { 
              where: { id: currentSessionId },
              transaction
            }
          );
        }

        await transaction.commit();
        io.emit('playersStateUpdate', {
          players: engine.session.players.map(p => ({
            ...p,
            hasMoved: p.socketId === socket.id ? true : p.hasMoved
          }))
        });

        io.emit('roadCashResult', {
          playerSocketId: socket.id,
          newMoney: updatedPlayerState.money,
          amount: amount
        });

        broadcastGameEvent(`${player.name} collected $${amount} from the road!`);

        socket.emit('movementDone', {
          player: updatedPlayerState,
          currentPlayerId: socket.id,
          hasMoved: true
        });

      } catch (err) {
        await transaction.rollback();
        console.error('Error processing road cash:', err);
      }
    } catch (err) {
      console.error('Error in road cash transaction:', err);
    }
  });

  socket.on('disconnect', async () => {
    console.log('[disconnect]', socket.id);
    
    const disconnectingPlayer = lobbyPlayers.find(p => p.socketId === socket.id);
    
    if (disconnectingPlayer && hasStarted) {
      if (!disconnectingPlayer.hasQuit) {
        console.log(`Storing disconnected player: ${disconnectingPlayer.name}`);
        
        try {
          const currentPlayer = engine.getPlayer(socket.id);
          if (currentPlayer) {
            const transaction = await sequelize.transaction();
            
            try {
              await Player.update(
                {
                  money: currentPlayer.money,
                  properties: currentPlayer.properties,
                  loan: currentPlayer.loan,
                  tileId: currentPlayer.tileId,
                  prevTile: currentPlayer.prevTile,
                  hasMoved: currentPlayer.hasMoved,
                  piece: currentPlayer.piece
                },
                { 
                  where: { socketId: socket.id },
                  transaction
                }
              );

              if (currentSessionId) {
                await GameSession.update(
                  { players: engine.session.players },
                  { 
                    where: { id: currentSessionId },
                    transaction
                  }
                );
              }

              await transaction.commit();
            } catch (err) {
              await transaction.rollback();
              console.error('Error saving player state on disconnect:', err);
            }
          }
        } catch (err) {
          console.error('Error in disconnect handler:', err);
        }
        
        disconnectedPlayers.set(disconnectingPlayer.name, disconnectingPlayer);
        
      }
    } else if (!hasStarted) {
      lobbyPlayers = lobbyPlayers.filter(p => p.socketId !== socket.id);
      engine.removePlayer(socket.id);
      io.emit('lobbyUpdate', lobbyPlayers);
    }
  });

  socket.on('updateProperty', async ({ playerId, propertyId, action, refundAmount }) => {
    console.log('[updateProperty]', { playerId, propertyId, action, refundAmount });
    
    const player = engine.getPlayer(playerId);
    if (!player) return;

    if (action === 'add') {
      if (!player.properties.includes(propertyId)) {
        player.properties.push(propertyId);
      }
    } else if (action === 'remove') {
      player.properties = player.properties.filter(id => id !== propertyId);
      if (refundAmount) {
        player.money += refundAmount;
      }
    }

    try {
      const transaction = await sequelize.transaction();

      try {
        const [updatedRows] = await Player.update(
          { 
            properties: player.properties,
            money: player.money
          },
          { 
            where: { socketId: playerId },
            transaction
          }
        );

        if (updatedRows === 0) {
          throw new Error('Failed to update player');
        }

        if (currentSessionId) {
          await GameSession.update(
            { players: engine.session.players },
            { 
              where: { id: currentSessionId },
              transaction
            }
          );
        }

        await transaction.commit();

        io.emit('propertyUpdated', {
          playerId,
          propertyId,
          action,
          newMoney: player.money
        });

        if (action === 'remove') {
          const { tiles } = require('./data/tiles.cjs');
          const property = tiles.find(t => t.id === propertyId);
          if (property) {
            broadcastGameEvent(`${player.name} sold ${property.name} for $${refundAmount}`);
          }
        }
      } catch (err) {
        await transaction.rollback();
        console.error('Error updating property ownership:', err);
      }
    } catch (err) {
      console.error('Error starting transaction:', err);
    }
  });

  socket.on('teleport', async ({ toTile, prevTile }) => {
    console.log('[teleport] request:', { playerId: socket.id, toTile, prevTile });
    
    const currentPlayer = engine.getPlayer(socket.id);
    if (!currentPlayer) return;

    try {
      const transaction = await sequelize.transaction();

      try {
        currentPlayer.prevTile = prevTile;
        currentPlayer.tileId = toTile;
        currentPlayer.hasMoved = true;

        await Player.update(
          { 
            prevTile: prevTile,
            tileId: toTile,
            hasMoved: true
          },
          { 
            where: { socketId: socket.id },
            transaction
          }
        );

        if (currentSessionId) {
          await GameSession.update(
            { 
              players: engine.session.players,
              moves: [
                ...engine.session.moves || [],
                { playerSocketId: socket.id, type: 'teleport', fromTile: prevTile, toTile }
              ]
            },
            { 
              where: { id: currentSessionId },
              transaction 
            }
          );
        }

        await transaction.commit();

        io.emit('playerMoved', { playerId: socket.id, tileId: toTile, hasMoved: currentPlayer.hasMoved });

        socket.emit('movementDone');

      } catch (err) {
        await transaction.rollback();
        console.error('Error processing teleport:', err);
      }
    } catch (err) {
      console.error('Error starting teleport transaction:', err);
    }

    if (currentPlayer.tileId !== 7) {  
      const { tiles } = require('./data/tiles.cjs');
      const playersOnTile = engine.session.players.filter(p => 
        p.tileId === currentPlayer.tileId && 
        p.socketId !== socket.id  
      );

      if (playersOnTile.length > 0) {
        const tile = tiles.find(t => t.id === currentPlayer.tileId);
        const tileOwner = engine.session.players.find(p => 
          p.properties && p.properties.includes(currentPlayer.tileId)
        );

        for (const targetPlayer of playersOnTile) {
          if (tileOwner && targetPlayer.socketId === tileOwner.socketId) {
            console.log(`Skipping stomp - target player owns the property`);
            continue;
          }

          const stompAmount = 2000;
          let transaction;
          
          try {
            transaction = await sequelize.transaction();
            const amountPaid = Math.min(targetPlayer.money, stompAmount);
            const loanIncrease = Math.max(0, stompAmount - amountPaid);
            
            targetPlayer.money -= amountPaid;
            if (loanIncrease > 0) {
              targetPlayer.loan = (targetPlayer.loan || 0) + loanIncrease;
            }
            
            currentPlayer.money += stompAmount;
            
            console.log(`Stomp: $${amountPaid} transferred from ${targetPlayer.name} to ${currentPlayer.name}` + 
                       (loanIncrease > 0 ? ` and $${loanIncrease} added to ${targetPlayer.name}'s loan` : ''));
            
            await Player.update(
              { 
                money: targetPlayer.money,
                loan: targetPlayer.loan || 0
              },
              { 
                where: { socketId: targetPlayer.socketId },
                transaction 
              }
            );
            
            await Player.update(
              { money: currentPlayer.money },
              { 
                where: { socketId: currentPlayer.socketId },
                transaction 
              }
            );
            
            engine.session.players = engine.session.players.map(p => {
              if (p.socketId === targetPlayer.socketId) {
                return { 
                  ...p, 
                  money: targetPlayer.money, 
                  loan: targetPlayer.loan || 0 
                };
              }
              if (p.socketId === currentPlayer.socketId) {
                return { 
                  ...p, 
                  money: currentPlayer.money 
                };
              }
              return p;
            });
            
            if (currentSessionId) {
              await GameSession.update(
                { players: engine.session.players },
                { 
                  where: { id: currentSessionId },
                  transaction 
                }
              );
            }
            
            await transaction.commit();
            
            io.emit('playerMoneyUpdate', {
              playerId: targetPlayer.socketId,
              newBalance: targetPlayer.money,
              loan: targetPlayer.loan || 0
            });
            
            io.emit('playerMoneyUpdate', {
              playerId: currentPlayer.socketId,
              newBalance: currentPlayer.money
            });
            
            let message = `${currentPlayer.name} stomped on ${targetPlayer.name} and collected $2000!`;
            broadcastGameEvent(message);
            
          } catch (err) {
            if (transaction && !transaction.finished) {
              await transaction.rollback();
            }
            console.error('Error processing stomp payment:', err);
            broadcastGameEvent(`Error processing stomp payment between ${finalPlayer.name} and ${targetPlayer.name}.`);
            throw err;
          }
        }
      }
    }
  });

  socket.on('stonePaperScissorsChoice', async ({ choice, gameId }) => {
    console.log('[stonePaperScissorsChoice]', { choice, gameId });
    
    const currentGame = activeRPSGames[gameId];
    if (!currentGame) {
      console.log('Game not found:', gameId);
      return;
    }

    console.log('Current game state before choice:', currentGame);

    if (socket.id === currentGame.landingPlayer.socketId) {
      currentGame.choices.landingPlayer = choice;
    } else {
      currentGame.closestPlayers.forEach(player => {
        if (socket.id === player.socketId) {
          currentGame.choices[player.socketId] = choice;
        }
      });
    }

    console.log('Updated game state:', currentGame);

    const allChoicesMade = currentGame.choices.landingPlayer && 
      currentGame.closestPlayers.every(p => currentGame.choices[p.socketId]);

    if (allChoicesMade) {
      console.log('All players have chosen. Determining winners and ties...');
      
      currentGame.closestPlayers.forEach(player => {
      const result = determineRPSWinner(
          currentGame.choices.landingPlayer,
          currentGame.choices[player.socketId]
      );

      if (result === 'tie') {
          currentGame.ties.push(player);
        } else if (result === 'landingPlayer') {
          currentGame.winners.push(player);
      } else {
          currentGame.losers.push(player);
        }
      });

      if (currentGame.winners.length > 0) {
        const moneyAmounts = currentGame.winners.map(p => p.money);
        const sumRest = moneyAmounts.reduce((sum, amount) => sum + Math.max(0, amount), 0);
        const toDistribute = currentGame.landingPlayer.money;

        currentGame.landingPlayer.money = sumRest;

        const shareAmount = Math.floor(toDistribute / currentGame.winners.length);
        currentGame.winners.forEach(player => {
          player.money = shareAmount;
        });

        try {
          const transaction = await sequelize.transaction();

          try {
            await Player.update(
              { money: currentGame.landingPlayer.money },
              { 
                where: { socketId: currentGame.landingPlayer.socketId },
                transaction
              }
            );

            for (const player of currentGame.winners) {
              await Player.update(
                { 
                  money: player.money,
                  loan: player.money < 0 ? 
                    (player.loan || 0) + Math.abs(player.money) : 
                    (player.loan || 0)
                },
                {
                  where: { socketId: player.socketId }
                }
              );
            }

            engine.session.players = engine.session.players.map(p => {
              if (p.socketId === currentGame.landingPlayer.socketId) {
                return { ...p, money: currentGame.landingPlayer.money };
              }
              const winner = currentGame.winners.find(w => w.socketId === p.socketId);
              if (winner) {
                return { ...p, money: winner.money };
              }
              return p;
            });

            await transaction.commit();

            io.emit('playersStateUpdate', {
              players: engine.session.players
            });

          } catch (err) {
            await transaction.rollback();
            console.error('Error updating player money:', err);
          }
        } catch (err) {
          console.error('Error in transaction:', err);
        }
      }

      if (currentGame.ties.length > 0) {
        currentGame.ties.forEach(tiedPlayer => {
          const maxAmount = Math.min(10000, tiedPlayer.money);
          io.emit('stonePaperScissorsTie', {
            landingPlayerId: currentGame.landingPlayer.socketId,
            tiedPlayerId: tiedPlayer.socketId,
            tiedPlayerName: tiedPlayer.name,
            maxAmount,
            gameId
          });
        });
      } else {
          io.emit('stonePaperScissorsResult', {
            landingPlayer: {
              ...currentGame.landingPlayer,
            choice: currentGame.choices.landingPlayer,
              money: currentGame.landingPlayer.money
            },
          winners: currentGame.winners.map(p => ({
            ...p,
            choice: currentGame.choices[p.socketId],
            money: p.money
          })),
          losers: currentGame.losers.map(p => ({
            ...p,
            choice: currentGame.choices[p.socketId],
            money: p.money
          })),
          ties: []
        });

          delete activeRPSGames[gameId];
      }
    }
  });

  socket.on('stonePaperScissorsTieAmount', async ({ gameId, amount, tiedPlayerId }) => {
    console.log('[stonePaperScissorsTieAmount]', { gameId, amount, tiedPlayerId });
    
    const currentGame = activeRPSGames[gameId];
    if (!currentGame) {
      console.log('Game not found:', gameId);
      return;
    }

    try {
      const transaction = await sequelize.transaction();

      try {
        const tiedPlayer = currentGame.ties.find(p => p.socketId === tiedPlayerId);
        if (!tiedPlayer) {
          throw new Error('Tied player not found: ' + tiedPlayerId);
        }

        const landingPlayer = currentGame.landingPlayer;
        landingPlayer.money += amount;
        tiedPlayer.money -= amount;

        landingPlayer.hasMoved = true;
        tiedPlayer.hasMoved = true;

        await Player.update(
          { 
            money: landingPlayer.money,
            hasMoved: true
          },
          { 
            where: { socketId: landingPlayer.socketId },
            transaction
          }
        );

        await Player.update(
          { 
            money: tiedPlayer.money,
            hasMoved: true
          },
          { 
            where: { socketId: tiedPlayer.socketId },
            transaction
          }
        );
        engine.session.players = engine.session.players.map(p => {
          if (p.socketId === landingPlayer.socketId) {
            return { ...p, money: landingPlayer.money, hasMoved: true };
          }
          if (p.socketId === tiedPlayer.socketId) {
            return { ...p, money: tiedPlayer.money, hasMoved: true };
          }
          return p;
        });

        if (currentSessionId) {
          await GameSession.update(
            { players: engine.session.players },
            { 
              where: { id: currentSessionId },
              transaction
            }
          );
        }

        await transaction.commit();

        currentGame.ties = currentGame.ties.filter(p => p.socketId !== tiedPlayerId);

        io.emit('playersStateUpdate', {
          players: engine.session.players
        });

        io.to(landingPlayer.socketId).emit('movementDone');
        io.to(tiedPlayer.socketId).emit('movementDone');

        io.emit('stonePaperScissorsTieResolved', {
          landingPlayer,
          tiedPlayer,
          drawnAmount: amount,
          remainingTies: currentGame.ties.length
        });

        if (currentGame.ties.length === 0) {
          delete activeRPSGames[gameId];
        }
      } catch (err) {
        await transaction.rollback();
        console.error('Error in RPS tie resolution:', err);
      }
    } catch (err) {
      console.error('Error starting RPS tie transaction:', err);
    }
  });

  socket.on('borrowMoney', async ({ amount }) => {
    console.log('[borrowMoney] Request received:', {
      playerId: socket.id,
      requestedAmount: amount
    });

    const player = engine.getPlayer(socket.id);
    if (!player) {
      console.log('[borrowMoney] Error: Player not found');
      socket.emit('borrowResponse', { 
        success: false, 
        error: 'Player not found' 
      });
      return;
    }

    console.log('[borrowMoney] Current player state:', {
      name: player.name,
      currentMoney: player.money,
      currentLoan: player.loan || 0
    });
    if (!amount || amount < 500) {
      console.log('[borrowMoney] Error: Invalid amount');
      socket.emit('borrowResponse', { 
        success: false, 
        error: 'Minimum borrowing amount is $500' 
      });
      return;
    }

    const currentLoan = player.loan || 0;
    player.loan = currentLoan + amount;
    player.money += amount;
    await Player.update(
      { loan: player.loan, money: player.money },
      { where: { socketId: socket.id } }
    );

    console.log('[borrowMoney] Updated player state:', {
      name: player.name,
      newMoney: player.money,
      newLoan: player.loan,
      addedAmount: amount
    });

    io.emit('loanUpdated', {
      playerId: socket.id,
      newMoney: player.money,
      loanAmount: player.loan
    });

    socket.emit('borrowResponse', { 
      success: true 
    });
    if (currentSessionId) {
      GameSession.findByIdAndUpdate(
        currentSessionId,
        { $set: { 'players.$[player].money': player.money, 'players.$[player].loan': player.loan } },
        { 
          arrayFilters: [{ 'player.socketId': socket.id }],
          new: true
        }
      ).then(() => {
        console.log('[borrowMoney] Game session updated successfully');
      }).catch(err => {
        console.error('[borrowMoney] Error updating game session:', err);
      });
    }
  });

  socket.on('payoffLoan', async ({ amount }) => {
    console.log('[payoffLoan] Request received:', {
      playerId: socket.id,
      requestedAmount: amount
    });

    const player = engine.getPlayer(socket.id);
    if (!player) {
      console.log('[payoffLoan] Error: Player not found');
      socket.emit('borrowResponse', { 
        success: false, 
        error: 'Player not found' 
      });
      return;
    }

    console.log('[payoffLoan] Current player state:', {
      name: player.name,
      currentMoney: player.money,
      currentLoan: player.loan || 0
    });

    if (!amount || amount < 500) {
      console.log('[payoffLoan] Error: Invalid amount');
      socket.emit('borrowResponse', { 
        success: false, 
        error: 'Minimum payment amount is $500' 
      });
      return;
    }

    if (player.money < amount) {
      console.log('[payoffLoan] Error: Insufficient funds');
      socket.emit('borrowResponse', { 
        success: false, 
        error: 'Insufficient funds' 
      });
      return;
    }

    if (!player.loan) {
      console.log('[payoffLoan] Error: No loan to pay off');
      socket.emit('borrowResponse', { 
        success: false, 
        error: 'No loan to pay off' 
      });
      return;
    }

    const transaction = await sequelize.transaction();
    try {
      const paymentAmount = Math.min(amount, player.loan);
      const newLoanAmount = player.loan - paymentAmount;
      const newMoneyAmount = player.money - paymentAmount;
      
      await Player.update(
        { 
          loan: newLoanAmount, 
          money: newMoneyAmount 
        },
        { 
          where: { socketId: socket.id },
          transaction
        }
      );

      player.loan = newLoanAmount;
      player.money = newMoneyAmount;

      console.log('[payoffLoan] Updated player state:', {
        name: player.name,
        newMoney: player.money,
        newLoan: player.loan,
        paidAmount: paymentAmount
      });

      if (currentSessionId) {
        const session = await GameSession.findByPk(currentSessionId, { transaction });
        if (session) {
          const updatedPlayers = session.players.map(p => 
            p.socketId === socket.id 
              ? { ...p, money: newMoneyAmount, loan: newLoanAmount }
              : p
          );
          
          await session.update({
            players: updatedPlayers
          }, { transaction });
          
          console.log('[payoffLoan] Game session updated successfully');
        }
      }

      await transaction.commit();

      io.emit('loanUpdated', {
        playerId: socket.id,
        newMoney: player.money,
        loanAmount: player.loan
      });

      socket.emit('borrowResponse', { 
        success: true 
      });
      
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      
      console.error('[payoffLoan] Error processing loan payoff:', error);
      socket.emit('borrowResponse', {
        success: false,
        error: 'An error occurred while processing your payment. Please try again.'
      });
      
      throw error;
    }
  });

  socket.on('stonePaperScissorsStart', (game) => {
    console.log('[RPS] Game started:', game);
    
    const landingPlayer = game.landingPlayer;
    if (landingPlayer.loan) {
      landingPlayer.money -= landingPlayer.loan;
      landingPlayer.loan = 0;
    }

    game.closestPlayers.forEach(player => {
      if (player.loan) {
        player.money -= player.loan;
        player.loan = 0;
      }
    });

    activeRPSGames[game.gameId] = {
      landingPlayer: landingPlayer,
      closestPlayers: game.closestPlayers,
      choices: {},
      winners: [],
      ties: [],
      losers: []
    };

    io.emit('stonePaperScissorsStart', {
      landingPlayer: landingPlayer,
      closestPlayers: game.closestPlayers,
      gameId: game.gameId
    });
  });

  socket.on('stonePaperScissorsResult', async (result) => {
    console.log('[RPS] Result received:', result);
    setRpsResult(result);
    
    const updatedPlayers = players.map(p => {
      const didWin = result.results?.some(r => 
        r.winner === 'landingPlayer' || 
        (r.winner === 'tie' && r.landingPlayerChoice && r.closestPlayerChoice)
      );
      
      if (p.socketId === result.landingPlayer.socketId && didWin) {
        let newMoney = result.landingPlayer.money;
        let newLoan = result.landingPlayer.loan || 0;
        
        if (newMoney < 0) {
          newLoan += Math.abs(newMoney);
          newMoney = 0;
        }
        
        return { ...p, money: newMoney, loan: newLoan };
      }
      
      const winner = result.winners.find(w => w.socketId === p.socketId);
      if (winner) {
        let newMoney = winner.money;
        let newLoan = winner.loan || 0;
        
        if (newMoney < 0) {
          newLoan += Math.abs(newMoney);
          newMoney = 0;
        }
        
        return { ...p, money: newMoney, loan: newLoan };
      }
      
      const loser = result.losers.find(l => l.socketId === p.socketId);
      if (loser) {
        let newMoney = loser.money;
        let newLoan = loser.loan || 0;
        
        if (newMoney < 0) {
          newLoan += Math.abs(newMoney);
          newMoney = 0;
        }
        
        return { ...p, money: newMoney, loan: newLoan };
      }
      
      return p;
    });
    
    try {
      const transaction = await sequelize.transaction();

      try {
        await Player.update(
          { 
            money: result.landingPlayer.money < 0 ? 0 : result.landingPlayer.money,
            loan: result.landingPlayer.money < 0 ? 
              (result.landingPlayer.loan || 0) + Math.abs(result.landingPlayer.money) : 
              (result.landingPlayer.loan || 0)
          },
          {
            where: { socketId: result.landingPlayer.socketId },
            transaction
          }
        );

        for (const winner of result.winners) {
          await Player.update(
            { 
              money: winner.money < 0 ? 0 : winner.money,
              loan: winner.money < 0 ? 
                (winner.loan || 0) + Math.abs(winner.money) : 
                (winner.loan || 0)
            },
            {
              where: { socketId: winner.socketId },
              transaction
            }
          );
        }

        for (const loser of result.losers) {
          await Player.update(
            { 
              money: loser.money < 0 ? 0 : loser.money,
              loan: loser.money < 0 ? 
                (loser.loan || 0) + Math.abs(loser.money) : 
                (loser.loan || 0)
            },
            {
              where: { socketId: loser.socketId },
              transaction
            }
          );
        }

        if (currentSessionId) {
          await GameSession.update(
            { players: engine.session.players },
            { 
              where: { id: currentSessionId },
              transaction 
            }
          );
        }

        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        console.error('Error updating player money and loans after RPS:', err);
      }
    } catch (err) {
      console.error('Error starting transaction:', err);
    }
  });

  socket.on('getActiveTradeOffers', () => {
    const offersForPlayer = activeTradeOffers.filter(
      offer => offer.to === socket.id
    );
    socket.emit('activeTradeOffers', offersForPlayer);
  });

  socket.on('tradeRequest', (request) => {
    console.log('[tradeRequest]', request);
    
    const fromPlayer = engine.getPlayer(request.from);
    const toPlayer = engine.getPlayer(request.to);
    if (!fromPlayer || !toPlayer) return;

    const fromPlayerHasProperties = request.offer.properties.every(propId => 
      fromPlayer.properties.includes(propId)
    );
    const toPlayerHasProperties = request.ask.properties.every(propId => 
      toPlayer.properties.includes(propId)
    );

    if (!fromPlayerHasProperties || !toPlayerHasProperties) {
      socket.emit('tradeRejected', { 
        offerId: request.id,
        reason: 'invalidProperties',
        message: 'One or more properties in the trade are no longer available.'
      });
      return;
    }

    activeTradeOffers.push(request);
    io.to(request.to).emit('tradeRequest', request);

    const offerProperties = request.offer.properties.map(propId => {
      const { tiles } = require('./data/tiles.cjs');
      const property = tiles.find(t => t.id === propId);
      return property ? property.name : 'Unknown';
    }).join(', ');
    
    const askProperties = request.ask.properties.map(propId => {
      const { tiles } = require('./data/tiles.cjs');
      const property = tiles.find(t => t.id === propId);
      return property ? property.name : 'Unknown';
    }).join(', ');

    let message = `${fromPlayer.name} offered ${toPlayer.name} a trade: `;
    
    const offerParts = [];
    if (request.offer.money > 0) offerParts.push(`$${request.offer.money}`);
    if (offerProperties) offerParts.push(offerProperties);
    message += offerParts.join(' and ');
    
    message += ' for ';
    
    const askParts = [];
    if (request.ask.money > 0) askParts.push(`$${request.ask.money}`);
    if (askProperties) askParts.push(askProperties);
    message += askParts.join(' and ');

    broadcastGameEvent(message);
  });

  socket.on('tradeResponse', async ({ offerId, accepted }) => {
    console.log('[tradeResponse]', { offerId, accepted });
    
    const offer = activeTradeOffers.find(o => o.id === offerId);
    if (!offer) return;

    const fromPlayer = engine.getPlayer(offer.from);
    const toPlayer = engine.getPlayer(offer.to);
    if (!fromPlayer || !toPlayer) return;

    if (accepted) {
      const fromPlayerCanAfford = fromPlayer.money >= offer.offer.money;
      const toPlayerCanAfford = toPlayer.money >= offer.ask.money;
      const fromPlayerHasProperties = offer.offer.properties.every(propId => 
        fromPlayer.properties.includes(propId)
      );
      const toPlayerHasProperties = offer.ask.properties.every(propId => 
        toPlayer.properties.includes(propId)
      );

      if (!fromPlayerCanAfford || !toPlayerCanAfford) {
        socket.emit('tradeRejected', { 
          offerId,
          reason: 'insufficientFunds',
          message: 'One or more players do not have enough money for this trade.',
          keepOffer: true
        });
        broadcastGameEvent(`Trade between ${fromPlayer.name} and ${toPlayer.name} failed: insufficient funds.`);
        return;
      }

      if (!fromPlayerHasProperties || !toPlayerHasProperties) {
        socket.emit('tradeRejected', { 
          offerId,
          reason: 'invalidProperties',
          message: 'One or more properties in the trade are no longer available.'
        });
        socket.broadcast.emit('tradeRejected', { 
          offerId,
          reason: 'invalidProperties',
          keepOffer: false
        });
        activeTradeOffers = activeTradeOffers.filter(o => o.id !== offerId);
        broadcastGameEvent(`Trade between ${fromPlayer.name} and ${toPlayer.name} failed: required properties no longer available.`);
        return;
      }

      try {
        const transaction = await sequelize.transaction();

        try {
          fromPlayer.money -= offer.offer.money;
          fromPlayer.money += offer.ask.money;
          toPlayer.money += offer.offer.money;
          toPlayer.money -= offer.ask.money;

          fromPlayer.properties = fromPlayer.properties.filter(p => !offer.offer.properties.includes(p));
          fromPlayer.properties.push(...offer.ask.properties);
          toPlayer.properties = toPlayer.properties.filter(p => !offer.ask.properties.includes(p));
          toPlayer.properties.push(...offer.offer.properties);

          const [fromPlayerUpdated] = await Player.update(
            { 
              money: fromPlayer.money, 
              properties: fromPlayer.properties 
            },
            { 
              where: { socketId: fromPlayer.socketId },
              transaction
            }
          );

          const [toPlayerUpdated] = await Player.update(
            { 
              money: toPlayer.money, 
              properties: toPlayer.properties 
            },
            { 
              where: { socketId: toPlayer.socketId },
              transaction
            }
          );

          if (!fromPlayerUpdated || !toPlayerUpdated) {
            throw new Error('Failed to update one or both players');
          }

          if (currentSessionId) {
            await GameSession.update(
              { players: engine.session.players },
              { 
                where: { id: currentSessionId },
                transaction
              }
            );
          }

          await transaction.commit();

          const invalidOffers = activeTradeOffers.filter(o => {
            const offeringPlayer = engine.getPlayer(o.from);
            return o.offer.properties.some(propId => !offeringPlayer.properties.includes(propId));
          });

          if (invalidOffers.length > 0) {
            invalidOffers.forEach(invalidOffer => {
              io.to(invalidOffer.to).emit('tradeRejected', {
                offerId: invalidOffer.id,
                reason: 'invalidProperties',
                keepOffer: false
              });
              io.to(invalidOffer.from).emit('tradeRejected', {
                offerId: invalidOffer.id,
                reason: 'invalidProperties',
                keepOffer: false
              });
              activeTradeOffers = activeTradeOffers.filter(o => o.id !== invalidOffer.id);
            });
          }

          if (invalidOffers.length > 0) {
            invalidOffers.forEach(invalidOffer => {
              io.to(invalidOffer.to).emit('tradeRejected', {
                offerId: invalidOffer.id,
                reason: 'invalidProperties',
                keepOffer: false
              });
              io.to(invalidOffer.from).emit('tradeRejected', {
                offerId: invalidOffer.id,
                reason: 'invalidProperties',
                keepOffer: false
              });
            });

            activeTradeOffers = activeTradeOffers.filter(o => 
              !invalidOffers.some(invalid => invalid.id === o.id)
            );
          }

          io.emit('tradeAccepted', {
            offerId,
            fromPlayer: {
              socketId: fromPlayer.socketId,
              money: fromPlayer.money,
              properties: fromPlayer.properties
            },
            toPlayer: {
              socketId: toPlayer.socketId,
              money: toPlayer.money,
              properties: toPlayer.properties
            }
          });

          io.emit('playersStateUpdate', {
            players: engine.session.players
          });
          const offeredProps = offer.offer.properties.map(propId => {
            const { tiles } = require('./data/tiles.cjs');
            const property = tiles.find(t => t.id === propId);
            return property ? property.name : 'Unknown';
          }).join(', ');
          
          const askProperties = offer.ask.properties.map(propId => {
            const { tiles } = require('./data/tiles.cjs');
            const property = tiles.find(t => t.id === propId);
            return property ? property.name : 'Unknown';
          }).join(', ');

          let message = `Trade completed: ${fromPlayer.name} gave ${toPlayer.name} `;
          
          const offeredParts = [];
          if (offer.offer.money > 0) offeredParts.push(`$${offer.offer.money}`);
          if (offeredProps) offeredParts.push(offerProps);
          message += offeredParts.join(' and ');
          
          message += ' in exchange for ';
          
          const askedParts = [];
          if (offer.ask.money > 0) askedParts.push(`$${offer.ask.money}`);
          if (askProperties) askedParts.push(askProperties);
          message += askedParts.join(' and ');

          broadcastGameEvent(message);

          activeTradeOffers = activeTradeOffers.filter(o => o.id !== offerId);
        } catch (err) {
          await transaction.rollback();
          console.error('Error processing trade:', err);
          broadcastGameEvent(`Trade between ${fromPlayer.name} and ${toPlayer.name} failed due to an error.`);
        }
      } catch (err) {
        console.error('Error starting transaction:', err);
        broadcastGameEvent(`Trade between ${fromPlayer.name} and ${toPlayer.name} failed due to an error.`);
      }
    } else {
      socket.broadcast.emit('tradeRejected', { 
        offerId,
        reason: 'rejected'
      });
      socket.emit('tradeRejected', { 
        offerId,
        reason: 'rejected',
        message: 'You rejected the trade.'
      });
      broadcastGameEvent(`${toPlayer.name} rejected ${fromPlayer.name}'s trade offer.`);
      activeTradeOffers = activeTradeOffers.filter(o => o.id !== offerId);
    }
  });

  socket.on('quitGame', () => {
    console.log('[Player quit game]', socket.id);
    
    const quittingPlayer = lobbyPlayers.find(p => p.socketId === socket.id);
    
    if (quittingPlayer && hasStarted) {
      console.log(`Player ${quittingPlayer.name} quit the game`);
      
      quittingPlayer.hasQuit = true;
      
      disconnectedPlayers.delete(quittingPlayer.name);
      
      const isCurrentPlayer = engine.session.players[engine.session.currentPlayerIndex].socketId === socket.id;
      if (isCurrentPlayer) {
        console.log(`Current player ${quittingPlayer.name} quit during their turn`);
        
        const currentPlayer = engine.getPlayer(socket.id);
        if (currentPlayer && currentPlayer.hasMoved) {
          console.log(`Auto-ending turn for quit player ${quittingPlayer.name}`);
        }
        
        const nextPlayerIndex = (engine.session.currentPlayerIndex + 1) % engine.session.players.length;
        engine.session.currentPlayerIndex = nextPlayerIndex;
        const nextPlayerId = engine.session.players[nextPlayerIndex].socketId;
        io.emit('turnEnded', { nextPlayerId });
        
        if (currentSessionId) {
          GameSession.findByIdAndUpdate(currentSessionId, { 
            currentPlayerIndex: nextPlayerId 
          }).catch(err => {
            console.error('Error updating game session after quit:', err);
          });
        }
      } else {
        const quitPlayerIndex = engine.session.players.findIndex(p => p.socketId === socket.id);
        if (quitPlayerIndex !== -1 && quitPlayerIndex < engine.session.currentPlayerIndex) {
          engine.session.currentPlayerIndex--;
          if (currentSessionId) {
            GameSession.findByIdAndUpdate(currentSessionId, { 
              currentPlayerIndex: engine.session.currentPlayerIndex 
            }).catch(err => {
              console.error('Error updating game session after quit:', err);
            });
          }
        }
      }

      engine.removePlayer(socket.id);
      lobbyPlayers = lobbyPlayers.filter(p => p.socketId !== socket.id);
      
      io.emit('playerQuit', {
        playerName: quittingPlayer.name,
        temporary: false
      });
      
      if (engine.session.players.length === 1) {
        const winner = engine.session.players[0];
        io.emit('gameOver', {
          winner: winner.name
        });
        hasStarted = false;
        lobbyPlayers = [];
        engine.session.players = [];
        currentSessionId = null;
      }
    } else if (!hasStarted) {
      lobbyPlayers = lobbyPlayers.filter(p => p.socketId !== socket.id);
      engine.removePlayer(socket.id);
      io.emit('lobbyUpdate', lobbyPlayers);
    }
  });

  socket.on("log", (VarName, value) => {
    console.log(`[Log] ${VarName}:`, value);
});

socket.on('clientPing', () => {
  });
});

function determineRPSWinner(choice1, choice2) {
  if (choice1 === choice2) return 'tie';
   
  if (
    (choice1 === 'rock' && choice2 === 'scissors') ||
    (choice1 === 'paper' && choice2 === 'rock') ||
    (choice1 === 'scissors' && choice2 === 'paper')
  ) {
    return 'landingPlayer';
  }
  
  return 'closestPlayer';
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});