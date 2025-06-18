const express       = require('express');
const http          = require('http');
const cors          = require('cors');
const { Server }    = require('socket.io');
const initDatabase  = require('./models/init');
const Player        = require('./models/Player');
const GameSession   = require('./models/GameSession');
const GameEngine    = require('./game/GameEngine');
const { calculateRentMultiplier } = require('./game/RentCalculator');
const sequelize     = require('./config/database');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const app  = express();
const server = http.createServer(app);

// Define allowed origins
const allowedOrigins = [
  'https://react-nodejs-game.onrender.com',
  'https://react-nodejs-game-client.onrender.com',
  'http://localhost:3000'
];

// CORS configuration
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
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

// Socket.io configuration
const io     = new Server(server, {
  cors: corsOptions
});

// Initialize database
initDatabase()
  .then(() => {
    console.log('✅ Database initialized');
    // Test the connection after initialization
    return sequelize.authenticate();
  })
  .then(() => {
    console.log('✅ Database connection established successfully.');
  })
  .catch(err => {
    console.error('❌ Database initialization/connection error:', err);
    // Add enhanced error logging
    console.error('Full error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
      original: err.original
    });
  });

app.use(express.json());

const engine          = new GameEngine();
let lobbyPlayers      = [];
let hasStarted        = false;
let currentSessionId  = null;
const branchResolvers = {};
const activeRPSGames = {};
const disconnectedPlayers = new Map(); // Store disconnected players by name
const gameEvents = []; // Store game events history
let activeTradeOffers = []; // Store active trade offers

// Function to broadcast game event
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

io.on('connection', socket => {
  console.log('🔌 Connected:', socket.id);

  // Send game events history to newly connected clients
  socket.emit('gameEventsHistory', gameEvents);

  socket.on('joinLobby', async ({ name }) => {
    console.log('[joinLobby] name:', name);
    
    // Check if name is already taken by an ACTIVE player
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
      const disconnectedPlayer = disconnectedPlayers.get(name);
      if (disconnectedPlayer) {
        // Player is reconnecting
        const oldSocketId = disconnectedPlayer.socketId;

        // Get the player's state from database
        try {
          const playerState = await Player.findOne({
            where: { socketId: oldSocketId }
          });
          
          if (playerState) {
            // Update socket ID in database and preserve all state
            await Player.update(
              { 
                socketId: socket.id,
                // Don't update other fields - keep them as is in database
              },
              { where: { socketId: oldSocketId } }
            );

            // Update engine state from database
            engine.session.players = engine.session.players.map(p =>
              p.socketId === oldSocketId ? {
                ...playerState.get(),  // Get all fields from database
                socketId: socket.id,
              } : p
            );
            
            // Update lobby state from database
            lobbyPlayers = lobbyPlayers.map(p =>
              p.socketId === oldSocketId ? {
                ...playerState.get(),  // Get all fields from database
                socketId: socket.id,
              } : p
            );

            // Update the disconnected player's state
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

        // Check if this player was the current player when they disconnected
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
            tileId: currentPlayer.tileId
          });
          
          // Only emit movementDone if it's not their turn or if they had already moved
          if (!isCurrentPlayer || currentPlayer.hasMoved) {
            socket.emit('movementDone');
          }
        }
        return;
      }
      return;
    }

    // Create new player
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
      engine.session.players            = arr;
      engine.session.currentPlayerIndex = 0;

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
    
    // Get current player
    const currentPlayer = engine.getPlayer(socket.id);
    if (!currentPlayer) return;

    // Don't allow rolling if player has already moved
    if (currentPlayer.hasMoved) {
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

    // Emit dice result to all players
    io.emit('diceResult', {
      playerId: socket.id,
      die1: roll.die1,
      die2: roll.die2,
      total: roll.total
    });

    let remaining = roll.total;
    let passedStart = false; // Track if passed start during movement

    while (remaining > 0) {
      const step = engine.moveOneStep(socket.id, roll.total);
      if (!step) break;

      if (step.branchChoices) {
        console.log('Branch choices:', step.branchChoices);
        socket.emit('branchChoices', { options: step.branchChoices.map(c => c.to) });
        const idx = await new Promise(res => branchResolvers[socket.id] = res);
        console.log('Branch selected index:', idx);
        const to = engine.chooseBranch(socket.id, step.branchChoices, idx);
        io.emit('playerMoved', { playerId: socket.id, tileId: to });
      } else {
        const player = engine.getPlayer(socket.id);
        const newTile = player.tileId;
        const prevTile = player.prevTile;
        console.log('Moved from tile', prevTile, 'to tile:', newTile);

        // Check if player landed on start
        if (newTile === 1 && !passedStart) {
          const bonusAmount = player.loan > 0 ? 4000 : 5000;
          console.log('Player landed on start! Awarding bonus.', {
            hasLoan: player.loan > 0,
            bonusAmount,
            currentLoan: player.loan
          });
          
          // Start a transaction
          const transaction = await sequelize.transaction();

          try {
            player.money += bonusAmount;
            passedStart = true; // Set flag to prevent double bonus
            
            // Update player in database within transaction
            await Player.update(
              { money: player.money },
              { where: { socketId: socket.id }, transaction }
            );

            // Update the engine's player data
            engine.session.players = engine.session.players.map(p =>
              p.socketId === socket.id ? { ...p, money: player.money } : p
            );

            // Update game session if exists
            if (currentSessionId) {
              await GameSession.update(
                { players: engine.session.players },
                { where: { id: currentSessionId }, transaction }
              );
            }

            // Commit transaction
            await transaction.commit();

            // Notify clients about the bonus
            io.emit('startBonus', {
              playerSocketId: socket.id,
              newMoney: player.money,
              amount: bonusAmount,
              reason: 'landing on'
            });

            // Broadcast game event
            const playerName = engine.getPlayer(socket.id).name;
            broadcastGameEvent(`${playerName} received $${bonusAmount} for landing on Start!`);

          } catch (err) {
            // Rollback transaction on error
            await transaction.rollback();
            console.error('Error processing start bonus:', err);
          }
        }
        // Check if we passed through start (tile 1) during movement
        // This only happens when moving from tile 30 to tile 2-29
        else if (prevTile === 30 && newTile > 1 && !passedStart) {
          const bonusAmount = player.loan > 0 ? 4000 : 5000;
          console.log('Player passed through start! Awarding bonus.', {
            hasLoan: player.loan > 0,
            bonusAmount,
            currentLoan: player.loan
          });
          player.money += bonusAmount;
          passedStart = true;
          
          // Update player in database
          try {
            const transaction = await sequelize.transaction();
            try {
              await Player.update(
                { money: player.money },
                { where: { socketId: socket.id }, transaction }
              );
              
              if (currentSessionId) {
                await GameSession.update(
                  { players: engine.session.players },
                  { where: { id: currentSessionId }, transaction }
                );
              }
              await transaction.commit();
              
              // Notify clients about the bonus
              io.emit('startBonus', {
                playerSocketId: socket.id,
                newMoney: player.money,
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

        io.emit('playerMoved', { playerId: socket.id, tileId: newTile });
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

    // Handle rent payment AFTER all movement is complete
    const finalTileId = currentPlayer.tileId;

    // Update prevTile based on final position
    if (finalTileId <= 30) {
      currentPlayer.prevTile = finalTileId === 1 ? 30 : finalTileId - 1;
      
      // Update player in database
      try {
        const transaction = await sequelize.transaction();
        await Player.update(
          { prevTile: currentPlayer.prevTile },
          { 
            where: { socketId: socket.id },
            transaction
          }
        );

        // If updating game session as well, include in same transaction
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

    const { tiles } = require('./data/tiles.cjs');
    const finalTile = tiles.find(t => t.id === finalTileId);
    
    console.log('Final position for rent check:', { 
      playerId: socket.id,
      tileId: finalTileId,
      tileName: finalTile?.name,
      tileType: finalTile?.type
    });

    // Find shortest paths if landed on Stone Paper Scissors
    if (finalTile?.name === 'Stone Paper Scissors') {
      console.log('\nLanded on Stone Paper Scissors! Finding shortest paths to other players...');
      const pathInfo = engine.findShortestPathsToPlayers(finalTileId);
      
      // Now handle multiple closest players
      if (pathInfo.closestPlayers.length > 0) {
        const gameId = Date.now();
        const closestPlayers = pathInfo.closestPlayers.map(playerName => {
          return engine.session.players.find(p => p.name === playerName);
        }).filter(Boolean);
        
        // Initialize the game state with multiple players
        activeRPSGames[gameId] = {
          landingPlayer: currentPlayer,
          closestPlayers: closestPlayers,
          choices: {}, // Will store all players' choices
          winners: [], // Players that landing player won against
          ties: [], // Players that tied with landing player
          losers: [] // Players that landing player lost against
        };

        io.emit('stonePaperScissorsStart', {
          landingPlayer: currentPlayer,
          closestPlayers: closestPlayers,
          gameId: gameId
        });
      }
    }

    if (finalTile?.type === 'property') {
      // First check if the current player owns this property
      const isOwnedByCurrentPlayer = currentPlayer.properties.includes(finalTile.id);
      
      // Then find if any other player owns it
      const propertyOwner = engine.session.players.find(p => 
        p.socketId !== socket.id && 
        p.properties.includes(finalTile.id)
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
        // Calculate rent with multiplier
        const rentMultiplier = calculateRentMultiplier(finalTile.id, propertyOwner.properties);
        const baseRent = finalTile.rent;
        const finalRent = baseRent * rentMultiplier;

        // Start a transaction
        const transaction = await sequelize.transaction();

        try {
        // Player landed on someone else's property - pay rent
        currentPlayer.money -= finalRent;
        propertyOwner.money += finalRent;

          // If player has negative money, convert it to loan and set money to 0
          if (currentPlayer.money < 0) {
            const loanIncrease = Math.abs(currentPlayer.money);
            currentPlayer.loan = (currentPlayer.loan || 0) + loanIncrease;
            currentPlayer.money = 0;
          }

          // Update both players in database within transaction
          await Player.update(
            { money: currentPlayer.money, loan: currentPlayer.loan },
            { where: { socketId: currentPlayer.socketId }, transaction }
          );

          await Player.update(
            { money: propertyOwner.money },
            { where: { socketId: propertyOwner.socketId }, transaction }
          );

          // Update the engine's player data
          engine.session.players = engine.session.players.map(p => {
            if (p.socketId === currentPlayer.socketId) {
              return { ...p, money: currentPlayer.money, loan: currentPlayer.loan };
            }
            if (p.socketId === propertyOwner.socketId) {
              return { ...p, money: propertyOwner.money };
            }
            return p;
          });

          // Update game session if exists
          if (currentSessionId) {
            await GameSession.update(
              { players: engine.session.players },
              { where: { id: currentSessionId }, transaction }
            );
          }

          // Commit transaction
          await transaction.commit();

          // Notify clients about the rent payment
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

          // Broadcast game event for rent payment
          const payer = engine.getPlayer(currentPlayer.socketId);
          const owner = engine.getPlayer(propertyOwner.socketId);
          const message = `${payer.name} paid $${finalRent} rent to ${owner.name} for ${finalTile.name}. ${payer.name} now has $${payer.money}${payer.loan ? ` and $${payer.loan} loan` : ''}.`;
          broadcastGameEvent(message);

        } catch (err) {
          // Rollback transaction on error
          await transaction.rollback();
          console.error('Error processing rent payment:', err);
        }
      } else if (isOwnedByCurrentPlayer) {
        // Player landed on their own property - get bonus rent with multiplier
        const rentMultiplier = calculateRentMultiplier(finalTile.id, currentPlayer.properties);
        const baseRent = finalTile.rent;
        const bonus = baseRent * rentMultiplier;

        // Start a transaction
        const transaction = await sequelize.transaction();

        try {
          // Add bonus to player's money
          currentPlayer.money += bonus;

          // Update player in database within transaction
          await Player.update(
            { money: currentPlayer.money },
            { where: { socketId: currentPlayer.socketId }, transaction }
          );

          // Update the engine's player data
          engine.session.players = engine.session.players.map(p =>
            p.socketId === currentPlayer.socketId ? { ...p, money: currentPlayer.money } : p
          );

          // Update game session if exists
          if (currentSessionId) {
            await GameSession.update(
              { players: engine.session.players },
              { where: { id: currentSessionId }, transaction }
            );
          }

          // Commit transaction
          await transaction.commit();

          // Notify clients about the bonus
          io.emit('rentBonus', {
            playerSocketId: currentPlayer.socketId,
            newMoney: currentPlayer.money,
            amount: bonus,
            propertyName: finalTile.name
          });

          // Broadcast game event for rent bonus
          const player = engine.getPlayer(currentPlayer.socketId);
          broadcastGameEvent(`${player.name} received $${bonus} bonus from their property ${finalTile.name}!`);

        } catch (err) {
          // Rollback transaction on error
          await transaction.rollback();
          console.error('Error processing rent bonus:', err);
        }
      }
    }

    console.log('Emitting movementDone for', socket.id);
    const rollingPlayer = engine.getPlayer(socket.id);
    rollingPlayer.hasMoved = true;
    socket.emit('movementDone');

    // After all movement is complete, mark player as moved and persist it
    try {
      await Player.update(
        { hasMoved: true },
        { where: { socketId: socket.id } }
      );
    } catch (err) {
      console.error('Error updating hasMoved state:', err);
    }
  });

  socket.on('branchChoice', idx => {
    console.log('[branchChoice] idx:', idx);
    const fn = branchResolvers[socket.id];
    if (fn) { fn(idx); delete branchResolvers[socket.id]; }
  });

  socket.on('endTurn', async () => {
    console.log('[endTurn] for', socket.id);
    const endingPlayer = engine.getPlayer(socket.id);
    if (endingPlayer) {
      endingPlayer.hasMoved = false;
    }
    const next = engine.endTurn();
    console.log('Next player:', next);
    io.emit('turnEnded', { nextPlayerId: next });
    if (currentSessionId) {
      await GameSession.findByIdAndUpdate(currentSessionId, { currentPlayerIndex: engine.session.currentPlayerIndex });
    }
  });

  // BUY PROPERTY handler
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
    console.log('Tile metadata:', tile);

    if (!tile || tile.type !== 'property') {
      console.log('purchaseFailed: notProperty');
      return socket.emit('purchaseFailed', { reason: 'notProperty' });
    }

    // Check if ANY player owns this property
    const isOwnedByAnyPlayer = engine.session.players.some(p => p.properties.includes(tile.id));
    if (isOwnedByAnyPlayer) {
      console.log('purchaseFailed: alreadyOwned');
      return socket.emit('purchaseFailed', { reason: 'alreadyOwned' });
    }

    if (playerObj.money < tile.cost) {
      console.log('purchaseFailed: insufficientFunds');
      return socket.emit('purchaseFailed', { reason: 'insufficientFunds' });
    }

      // Start a transaction
      const transaction = await sequelize.transaction();

      try {
    // perform purchase
        playerObj.money -= tile.cost;
    playerObj.properties.push(tile.id);
    console.log('After purchase - money:', playerObj.money, 'properties:', playerObj.properties);

        // Update player in database within transaction
        const updatedPlayer = await Player.update(
          {
            money: playerObj.money,
            properties: playerObj.properties
          },
          {
            where: { socketId: socket.id },
            returning: true,
            transaction
          }
        );

        if (!updatedPlayer[0]) {
          throw new Error('Failed to update player');
        }

        // If game session exists, update it within the same transaction
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

        // Commit transaction
        await transaction.commit();

        // Broadcast game event for property purchase
        broadcastGameEvent(`${playerObj.name} bought ${tile.name} for $${tile.cost}`);

    console.log('purchaseSuccess emit');
    io.emit('purchaseSuccess', {
          socketId: socket.id,
          money: playerObj.money,
      properties: playerObj.properties
    });
      } catch (err) {
        // Rollback transaction on error
        await transaction.rollback();
        console.error('Transaction error:', err);
        // Add enhanced error logging
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
      // Add enhanced error logging
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

  // Handle casino roll
  socket.on('casinoRoll', async ({ betAmount, betType }) => {
    console.log('[casinoRoll]', { betAmount, betType });
    
    const player = engine.getPlayer(socket.id);
    if (!player) return;

    // Start a transaction
    const transaction = await sequelize.transaction();

    try {
      // Roll the dice
      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      const total = die1 + die2;
      console.log('Casino roll:', { die1, die2, total });

      // Determine if player won based on bet type
      let won = false;
      if (betType === 'above' && total > 7) won = true;
      else if (betType === 'below' && total < 7) won = true;
      else if (betType === '7' && total === 7) won = true;

      // Calculate money change (3x for '7' bet, 2x for others)
      const multiplier = betType === '7' ? 3 : 2;
      const moneyChange = won ? betAmount * multiplier : -betAmount;
      player.money += moneyChange;

      // If player has negative money, convert it to loan
      if (player.money < 0) {
        const loanIncrease = Math.abs(player.money);
        player.loan = (player.loan || 0) + loanIncrease;
        player.money = 0;
      }

      // Update player in database within transaction
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

      // Update the engine's player data
      engine.session.players = engine.session.players.map(p =>
        p.socketId === socket.id ? { ...p, money: player.money, loan: player.loan } : p
      );

      // Update game session if exists
      if (currentSessionId) {
        await GameSession.update(
          { players: engine.session.players },
          { 
            where: { id: currentSessionId },
            transaction
          }
        );
      }

      // Commit transaction
      await transaction.commit();

      // Notify all clients about the result
      io.emit('casinoResult', {
        playerId: socket.id,
        dice: [die1, die2],
        amount: Math.abs(moneyChange),
        won,
        playerMoney: player.money,
        playerLoan: player.loan,
        playerName: player.name
      });

      // Broadcast game event for casino result
      const resultMessage = won 
        ? `${player.name} won $${Math.abs(moneyChange)} at the casino!`
        : `${player.name} lost $${Math.abs(moneyChange)} at the casino!`;
      broadcastGameEvent(resultMessage);

      // Mark casino event as complete
      player.hasMoved = true;
      io.emit('movementDone', { playerId: socket.id });

    } catch (err) {
      // Rollback transaction on error
      await transaction.rollback();
      console.error('Error processing casino bet:', err);
    }
  });

  // Handle road cash selection
  socket.on('roadCashSelected', async ({ amount }) => {
    console.log('[roadCashSelected]', { amount });
    
    const player = engine.getPlayer(socket.id);
    if (!player) return;

    try {
      // Start a transaction
      const transaction = await sequelize.transaction();

      try {
        // Add the amount to player's money and mark as moved
        player.money += amount;
        player.hasMoved = true;

        // Update player in database within transaction
        await Player.update(
          { 
            money: player.money,
            hasMoved: true
          },
          { 
            where: { socketId: socket.id },
            transaction
          }
        );

        // Update the engine's player data
        engine.session.players = engine.session.players.map(p =>
          p.socketId === socket.id ? { ...p, money: player.money, hasMoved: true } : p
        );

        // Update game session if exists
        if (currentSessionId) {
          await GameSession.update(
            { players: engine.session.players },
            { where: { id: currentSessionId }, transaction }
          );
        }

        // Commit transaction
        await transaction.commit();

        // Notify all clients about the result and state updates
        io.emit('playersStateUpdate', {
          players: engine.session.players
        });

        io.emit('roadCashResult', {
          playerSocketId: socket.id,
          newMoney: player.money,
          amount: amount,
          hasMoved: true
        });

        // Broadcast game event for road cash
        broadcastGameEvent(`${player.name} won $${amount} on the road!`);

        // Emit movementDone to trigger client state update
        socket.emit('movementDone');

      } catch (err) {
        // Rollback transaction on error
        await transaction.rollback();
        console.error('Error processing road cash:', err);
      }
    } catch (err) {
      console.error('Error starting road cash transaction:', err);
    }
  });

  // When landing on Road tile (ID 22)
  socket.on('landOnRoad', () => {
    console.log('[landOnRoad] Player landed on Road tile');
    const player = engine.getPlayer(socket.id);
    if (!player) return;

    // Generate random amounts for selection
    const amounts = [1000, 2000, 3000, 4000, 5000]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    socket.emit('roadCashOptions', {
      amounts
    });
  });

  socket.on('disconnect', async () => {
    console.log('[disconnect]', socket.id);
    
    // Find the disconnecting player
    const disconnectingPlayer = lobbyPlayers.find(p => p.socketId === socket.id);
    
    if (disconnectingPlayer && hasStarted) {
      // Only handle disconnect if player hasn't already quit
      if (!disconnectingPlayer.hasQuit) {
        console.log(`Storing disconnected player: ${disconnectingPlayer.name}`);
        
        // Save current state to database before storing
        try {
          const currentPlayer = engine.getPlayer(socket.id);
          if (currentPlayer) {
            // Start a transaction
            const transaction = await sequelize.transaction();
            
            try {
              // Update player in database
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

              // Update game session if exists
              if (currentSessionId) {
                await GameSession.update(
                  { players: engine.session.players },
                  { 
                    where: { id: currentSessionId },
                    transaction
                  }
                );
              }

              // Commit transaction
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
        
        // Check if it was their turn
        const isCurrentPlayer = engine.session.players[engine.session.currentPlayerIndex].socketId === socket.id;
        if (isCurrentPlayer) {
          console.log(`Current player ${disconnectingPlayer.name} disconnected during their turn`);
          // Only advance turn if they had already moved
          const currentPlayer = engine.getPlayer(socket.id);
          if (currentPlayer && currentPlayer.hasMoved) {
            console.log(`Player had already moved, advancing turn`);
            
            // Advance to next player
            const nextPlayerIndex = (engine.session.currentPlayerIndex + 1) % engine.session.players.length;
            engine.session.currentPlayerIndex = nextPlayerIndex;
            const nextPlayerId = engine.session.players[nextPlayerIndex].socketId;

            // Update game session if exists
            if (currentSessionId) {
              try {
                await GameSession.update(
                  { currentPlayerIndex: nextPlayerIndex },
                  { where: { id: currentSessionId } }
                );
              } catch (err) {
                console.error('Error updating game session after turn advance:', err);
              }
            }

            // Notify all clients about turn change
            io.emit('turnEnded', { nextPlayerId });
            console.log('Turn advanced to next player:', nextPlayerId);
          } else {
            console.log(`Player had not moved yet, keeping their turn`);
          }
        }
      }
    } else if (!hasStarted) {
      // Remove from lobby and engine if game hasn't started
      lobbyPlayers = lobbyPlayers.filter(p => p.socketId !== socket.id);
      engine.removePlayer(socket.id);
      io.emit('lobbyUpdate', lobbyPlayers);
    }
  });

  // Handle property ownership updates
  socket.on('updateProperty', async ({ playerId, propertyId, action, refundAmount }) => {
    console.log('[updateProperty]', { playerId, propertyId, action, refundAmount });
    
    const player = engine.getPlayer(playerId);
    if (!player) return;

    if (action === 'add') {
      // Add property to player's properties if not already owned
      if (!player.properties.includes(propertyId)) {
        player.properties.push(propertyId);
      }
    } else if (action === 'remove') {
      // Remove property from player's properties and refund the cost
      player.properties = player.properties.filter(id => id !== propertyId);
      if (refundAmount) {
        player.money += refundAmount;
      }
    }

    try {
      // Start a transaction
      const transaction = await sequelize.transaction();

      try {
        // Update player in database within transaction
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

        // Update game session if exists
        if (currentSessionId) {
          await GameSession.update(
            { players: engine.session.players },
            { 
              where: { id: currentSessionId },
              transaction
            }
          );
        }

        // Commit transaction
        await transaction.commit();

        // Notify all clients about the property update and money change
        io.emit('propertyUpdated', {
          playerId,
          propertyId,
          action,
          newMoney: player.money
        });

        // Broadcast game event for property sale
        if (action === 'remove') {
          const { tiles } = require('./data/tiles.cjs');
          const property = tiles.find(t => t.id === propertyId);
          if (property) {
            broadcastGameEvent(`${player.name} sold ${property.name} for $${refundAmount}`);
          }
        }
      } catch (err) {
        // Rollback transaction on error
        await transaction.rollback();
        console.error('Error updating property ownership:', err);
      }
    } catch (err) {
      console.error('Error starting transaction:', err);
    }
  });

  // Handle teleport
  socket.on('teleport', async ({ toTile, prevTile }) => {
    console.log('[teleport] request:', { playerId: socket.id, toTile, prevTile });
    
    const currentPlayer = engine.getPlayer(socket.id);
    if (!currentPlayer) return;

    try {
      // Start a transaction
      const transaction = await sequelize.transaction();

      try {
        // Update player position
        currentPlayer.prevTile = prevTile;
        currentPlayer.tileId = toTile;
        currentPlayer.hasMoved = true;  // Mark as moved after teleport

        // Update player in database
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

        // Update game session
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

        // Commit transaction
        await transaction.commit();

        // Notify all clients about the move
        io.emit('playerMoved', { playerId: socket.id, tileId: toTile });

        // Emit movementDone to trigger any post-movement actions
        socket.emit('movementDone');

      } catch (err) {
        await transaction.rollback();
        console.error('Error processing teleport:', err);
      }
    } catch (err) {
      console.error('Error starting teleport transaction:', err);
    }
  });

  // Handle Stone Paper Scissors choice
  socket.on('stonePaperScissorsChoice', async ({ choice, gameId }) => {
    console.log('[stonePaperScissorsChoice]', { choice, gameId });
    
    const currentGame = activeRPSGames[gameId];
    if (!currentGame) {
      console.log('Game not found:', gameId);
      return;
    }

    console.log('Current game state before choice:', currentGame);

    // Record the player's choice
    if (socket.id === currentGame.landingPlayer.socketId) {
      currentGame.choices.landingPlayer = choice;
    } else {
      // Record choice for closest players
      currentGame.closestPlayers.forEach(player => {
        if (socket.id === player.socketId) {
          currentGame.choices[player.socketId] = choice;
        }
      });
    }

    console.log('Updated game state:', currentGame);

    // Check if all players have made their choices
    const allChoicesMade = currentGame.choices.landingPlayer && 
      currentGame.closestPlayers.every(p => currentGame.choices[p.socketId]);

    if (allChoicesMade) {
      console.log('All players have chosen. Determining winners and ties...');
      
      // Process each closest player's result
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

      // First handle the players that landing player won against
      if (currentGame.winners.length > 0) {
        // Store money amounts in temp variables
        const moneyAmounts = currentGame.winners.map(p => p.money);
        const sumRest = moneyAmounts.reduce((sum, amount) => sum + Math.max(0, amount), 0);
        const toDistribute = currentGame.landingPlayer.money;

        // Update landing player's money to sum of losers
        currentGame.landingPlayer.money = sumRest;

        // Distribute landing player's money equally among losers
        const shareAmount = Math.floor(toDistribute / currentGame.winners.length);
        currentGame.winners.forEach(player => {
          player.money = shareAmount;
        });

        // Update database and engine for all affected players
        try {
          // Start a transaction
          const transaction = await sequelize.transaction();

          try {
            // Update landing player
            await Player.update(
              { money: currentGame.landingPlayer.money },
              { 
                where: { socketId: currentGame.landingPlayer.socketId },
                transaction
              }
            );

            // Update all winners
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

            // Update engine's player data
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

            // Commit transaction
            await transaction.commit();

            // Broadcast the updated state to all clients
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

      // Then handle ties if any
      if (currentGame.ties.length > 0) {
        // Emit tie resolution event for each tied player
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
        // If no ties, emit the final result immediately
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

        // Clean up the game if no ties
          delete activeRPSGames[gameId];
      }
    }
  });

  // Handle tie amount selection - modified for multiple ties
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
        // Find the specific tied player
        const tiedPlayer = currentGame.ties.find(p => p.socketId === tiedPlayerId);
        if (!tiedPlayer) {
          throw new Error('Tied player not found: ' + tiedPlayerId);
        }

        // Transfer the amount between landing player and this tied player
        const landingPlayer = currentGame.landingPlayer;
        landingPlayer.money += amount;
        tiedPlayer.money -= amount;

        // Mark both players as having moved after RPS resolution
        landingPlayer.hasMoved = true;
        tiedPlayer.hasMoved = true;

        // Update both players in database
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

        // Update engine's player data
        engine.session.players = engine.session.players.map(p => {
          if (p.socketId === landingPlayer.socketId) {
            return { ...p, money: landingPlayer.money, hasMoved: true };
          }
          if (p.socketId === tiedPlayer.socketId) {
            return { ...p, money: tiedPlayer.money, hasMoved: true };
          }
          return p;
        });

        // Update game session
        if (currentSessionId) {
          await GameSession.update(
            { players: engine.session.players },
            { 
              where: { id: currentSessionId },
              transaction
            }
          );
        }

        // Commit transaction
        await transaction.commit();

        // Remove the tied player from the list of ties
        currentGame.ties = currentGame.ties.filter(p => p.socketId !== tiedPlayerId);

        // Broadcast updates
        io.emit('playersStateUpdate', {
          players: engine.session.players
        });

        // Emit movementDone to both players
        io.to(landingPlayer.socketId).emit('movementDone');
        io.to(tiedPlayer.socketId).emit('movementDone');

        // If this was the last tie to resolve, clean up the game
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

    // Get the player
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

    // Validate amount
    if (!amount || amount < 500) {
      console.log('[borrowMoney] Error: Invalid amount');
      socket.emit('borrowResponse', { 
        success: false, 
        error: 'Minimum borrowing amount is $500' 
      });
      return;
    }

    // Update player's money and loan
    const currentLoan = player.loan || 0;
    player.loan = currentLoan + amount;
    player.money += amount;

    console.log('[borrowMoney] Updated player state:', {
      name: player.name,
      newMoney: player.money,
      newLoan: player.loan,
      addedAmount: amount
    });

    // Notify all clients about the update
    io.emit('loanUpdated', {
      playerId: socket.id,
      newMoney: player.money,
      loanAmount: player.loan
    });

    // Send success response
    socket.emit('borrowResponse', { 
      success: true 
    });

    // Update game session
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

    // Get the player
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

    // Validate amount
    if (!amount || amount < 500) {
      console.log('[payoffLoan] Error: Invalid amount');
      socket.emit('borrowResponse', { 
        success: false, 
        error: 'Minimum payment amount is $500' 
      });
      return;
    }

    // Validate player has enough money
    if (player.money < amount) {
      console.log('[payoffLoan] Error: Insufficient funds');
      socket.emit('borrowResponse', { 
        success: false, 
        error: 'Insufficient funds' 
      });
      return;
    }

    // Validate player has loan to pay off
    if (!player.loan) {
      console.log('[payoffLoan] Error: No loan to pay off');
      socket.emit('borrowResponse', { 
        success: false, 
        error: 'No loan to pay off' 
      });
      return;
    }

    // Ensure we don't pay more than the loan amount
    const paymentAmount = Math.min(amount, player.loan);

    // Update player's money and loan
    player.loan -= paymentAmount;
    player.money -= paymentAmount;

    console.log('[payoffLoan] Updated player state:', {
      name: player.name,
      newMoney: player.money,
      newLoan: player.loan,
      paidAmount: paymentAmount
    });

    // Notify all clients about the update
    io.emit('loanUpdated', {
      playerId: socket.id,
      newMoney: player.money,
      loanAmount: player.loan
    });

    // Send success response
    socket.emit('borrowResponse', { 
      success: true 
    });

    // Update game session
    if (currentSessionId) {
      GameSession.findByIdAndUpdate(
        currentSessionId,
        { $set: { 'players.$[player].money': player.money, 'players.$[player].loan': player.loan } },
        { 
          arrayFilters: [{ 'player.socketId': socket.id }],
          new: true
        }
      ).then(() => {
        console.log('[payoffLoan] Game session updated successfully');
      }).catch(err => {
        console.error('[payoffLoan] Error updating game session:', err);
      });
    }
  });

  socket.on('stonePaperScissorsStart', (game) => {
    console.log('[RPS] Game started:', game);
    
    // First deduct loans from all involved players' money
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

    // Initialize the game state with multiple players
    activeRPSGames[game.gameId] = {
      landingPlayer: landingPlayer,
      closestPlayers: game.closestPlayers,
      choices: {}, // Will store all players' choices
      winners: [], // Players that landing player won against
      ties: [], // Players that tied with landing player
      losers: [] // Players that landing player lost against
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
    
    // Update players' money in the game state
    const updatedPlayers = players.map(p => {
      if (p.socketId === result.landingPlayer.socketId) {
        // Convert negative money to loan for landing player
        let newMoney = result.landingPlayer.money;
        let newLoan = result.landingPlayer.loan || 0;
        
        if (newMoney < 0) {
          newLoan += Math.abs(newMoney);
          newMoney = 0;
        }
        
        return { ...p, money: newMoney, loan: newLoan };
      }
      
      // Update winners' money and loans
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
      
      // Update losers' money and loans
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
    
    // Update database for all affected players
    try {
      const transaction = await sequelize.transaction();

      try {
        // Update landing player
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

        // Update winners
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

        // Update losers
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

        // Update game session if exists
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

  // Add chat message handler
  socket.on('chatMessage', (message) => {
    console.log('[Chat] Message received:', message);
    io.emit('chatMessage', message);
  });

  // Handle trade request
  socket.on('tradeRequest', (request) => {
    console.log('[tradeRequest]', request);
    
    // Find the players
    const fromPlayer = engine.getPlayer(request.from);
    const toPlayer = engine.getPlayer(request.to);
    if (!fromPlayer || !toPlayer) return;

    // Validate properties still exist
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

    // Store the trade offer
    activeTradeOffers.push(request);

    // Forward the trade request to the target player
    io.to(request.to).emit('tradeRequest', request);

    // Broadcast game event for trade request
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
    if (askProperties) askParts.push(askedProperties);
    message += askParts.join(' and ');

    broadcastGameEvent(message);
  });

  // Handle trade response
  socket.on('tradeResponse', async ({ offerId, accepted }) => {
    console.log('[tradeResponse]', { offerId, accepted });
    
    const offer = activeTradeOffers.find(o => o.id === offerId);
    if (!offer) return;

    const fromPlayer = engine.getPlayer(offer.from);
    const toPlayer = engine.getPlayer(offer.to);
    if (!fromPlayer || !toPlayer) return;

    if (accepted) {
      // Check if players still have the required money
      const fromPlayerCanAfford = fromPlayer.money >= offer.offer.money;
      const toPlayerCanAfford = toPlayer.money >= offer.ask.money;

      // Check if players still have the required properties
      const fromPlayerHasProperties = offer.offer.properties.every(propId => 
        fromPlayer.properties.includes(propId)
      );
      const toPlayerHasProperties = offer.ask.properties.every(propId => 
        toPlayer.properties.includes(propId)
      );

      // If players can't afford, send insufficient funds message but keep the offer
      if (!fromPlayerCanAfford || !toPlayerCanAfford) {
        // Send error to the player who tried to accept
        socket.emit('tradeRejected', { 
          offerId,
          reason: 'insufficientFunds',
          message: 'One or more players do not have enough money for this trade.',
          keepOffer: true
        });
        broadcastGameEvent(`Trade between ${fromPlayer.name} and ${toPlayer.name} failed: insufficient funds.`);
        return;
      }

      // If properties are no longer available, remove the trade offer
      if (!fromPlayerHasProperties || !toPlayerHasProperties) {
        // Send error to the player who tried to accept
        socket.emit('tradeRejected', { 
          offerId,
          reason: 'invalidProperties',
          message: 'One or more properties in the trade are no longer available.'
        });
        // Notify others about removal 
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
        // Start a transaction
        const transaction = await sequelize.transaction();

        try {
          // Update money and properties for both players
          fromPlayer.money -= offer.offer.money;
          fromPlayer.money += offer.ask.money;
          toPlayer.money += offer.offer.money;
          toPlayer.money -= offer.ask.money;

          fromPlayer.properties = fromPlayer.properties.filter(p => !offer.offer.properties.includes(p));
          fromPlayer.properties.push(...offer.ask.properties);
          toPlayer.properties = toPlayer.properties.filter(p => !offer.ask.properties.includes(p));
          toPlayer.properties.push(...offer.offer.properties);

          // Update both players in database within transaction
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

          // Update game session if exists
          if (currentSessionId) {
            await GameSession.update(
              { players: engine.session.players },
              { 
                where: { id: currentSessionId },
                transaction
              }
            );
          }

          // Commit transaction
          await transaction.commit();

          // After successful trade, check and remove any invalid trades
          const invalidOffers = activeTradeOffers.filter(o => {
            const offeringPlayer = engine.getPlayer(o.from);
            // Check if offering player still owns all properties they're offering
            return o.offer.properties.some(propId => !offeringPlayer.properties.includes(propId));
          });

          // Remove invalid offers and notify clients
          if (invalidOffers.length > 0) {
            invalidOffers.forEach(invalidOffer => {
              // Notify players involved in invalid trades
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

            // Remove invalid offers from active trades
            activeTradeOffers = activeTradeOffers.filter(o => 
              !invalidOffers.some(invalid => invalid.id === o.id)
            );
          }

          // Notify all clients about the successful trade
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

          // Create detailed game event message
          const offeredProps = offer.offer.properties.map(propId => {
            const { tiles } = require('./data/tiles.cjs');
            const property = tiles.find(t => t.id === propId);
            return property ? property.name : 'Unknown';
          }).join(', ');
          
          const askedProps = offer.ask.properties.map(propId => {
            const { tiles } = require('./data/tiles.cjs');
            const property = tiles.find(t => t.id === propId);
            return property ? property.name : 'Unknown';
          }).join(', ');

          let message = `Trade completed: ${fromPlayer.name} gave ${toPlayer.name} `;
          
          const offeredParts = [];
          if (offer.offer.money > 0) offeredParts.push(`$${offer.offer.money}`);
          if (offeredProps) offeredParts.push(offeredProps);
          message += offeredParts.join(' and ');
          
          message += ' in exchange for ';
          
          const askedParts = [];
          if (offer.ask.money > 0) askedParts.push(`$${offer.ask.money}`);
          if (askedProps) askedParts.push(askedProps);
          message += askedParts.join(' and ');

          broadcastGameEvent(message);

          // Remove the completed trade offer
          activeTradeOffers = activeTradeOffers.filter(o => o.id !== offerId);
        } catch (err) {
          // Rollback transaction on error
          await transaction.rollback();
          console.error('Error processing trade:', err);
          broadcastGameEvent(`Trade between ${fromPlayer.name} and ${toPlayer.name} failed due to an error.`);
        }
      } catch (err) {
        console.error('Error starting transaction:', err);
        broadcastGameEvent(`Trade between ${fromPlayer.name} and ${toPlayer.name} failed due to an error.`);
      }
    } else {
      // Notify about rejected trade
      socket.broadcast.emit('tradeRejected', { 
        offerId,
        reason: 'rejected'
      });
      // Send rejection confirmation to the player who rejected
      socket.emit('tradeRejected', { 
        offerId,
        reason: 'rejected',
        message: 'You rejected the trade.'
      });
      broadcastGameEvent(`${toPlayer.name} rejected ${fromPlayer.name}'s trade offer.`);
      // Remove the rejected offer
      activeTradeOffers = activeTradeOffers.filter(o => o.id !== offerId);
    }
  });

  socket.on('quitGame', () => {
    console.log('[Player quit game]', socket.id);
    
    // Find the quitting player
    const quittingPlayer = lobbyPlayers.find(p => p.socketId === socket.id);
    
    if (quittingPlayer && hasStarted) {
      console.log(`Player ${quittingPlayer.name} quit the game`);
      
      // Mark player as quit to prevent disconnect handler from processing
      quittingPlayer.hasQuit = true;
      
      // Remove from disconnectedPlayers if they were there
      disconnectedPlayers.delete(quittingPlayer.name);
      
      // Check if it was their turn and handle turn ending
      const isCurrentPlayer = engine.session.players[engine.session.currentPlayerIndex].socketId === socket.id;
      if (isCurrentPlayer) {
        console.log(`Current player ${quittingPlayer.name} quit during their turn`);
        
        // End their turn if they had already moved
        const currentPlayer = engine.getPlayer(socket.id);
        if (currentPlayer && currentPlayer.hasMoved) {
          console.log(`Auto-ending turn for quit player ${quittingPlayer.name}`);
        }
        
        // Always advance turn for quitting current player
        const nextPlayerIndex = (engine.session.currentPlayerIndex + 1) % engine.session.players.length;
        engine.session.currentPlayerIndex = nextPlayerIndex;
        const nextPlayerId = engine.session.players[nextPlayerIndex].socketId;
        io.emit('turnEnded', { nextPlayerId });
        
        // Update game session if exists
        if (currentSessionId) {
          GameSession.findByIdAndUpdate(currentSessionId, { 
            currentPlayerIndex: nextPlayerId 
          }).catch(err => {
            console.error('Error updating game session after quit:', err);
          });
        }
      } else {
        // If they weren't the current player, adjust currentPlayerIndex if needed
        const quitPlayerIndex = engine.session.players.findIndex(p => p.socketId === socket.id);
        if (quitPlayerIndex !== -1 && quitPlayerIndex < engine.session.currentPlayerIndex) {
          engine.session.currentPlayerIndex--;
          // Update game session if exists
          if (currentSessionId) {
            GameSession.findByIdAndUpdate(currentSessionId, { 
              currentPlayerIndex: engine.session.currentPlayerIndex 
            }).catch(err => {
              console.error('Error updating game session after quit:', err);
            });
          }
        }
      }

      // Remove from engine and update game state
      engine.removePlayer(socket.id);
      lobbyPlayers = lobbyPlayers.filter(p => p.socketId !== socket.id);
      
      // Notify all clients
      io.emit('playerQuit', {
        playerName: quittingPlayer.name,
        temporary: false
      });
      
      // If only one player remains, end the game
      if (engine.session.players.length === 1) {
        const winner = engine.session.players[0];
        io.emit('gameOver', {
          winner: winner.name
        });
        // Reset game state
        hasStarted = false;
        lobbyPlayers = [];
        engine.session.players = [];
        currentSessionId = null;
      }
    } else if (!hasStarted) {
      // Remove from lobby and engine if game hasn't started
      lobbyPlayers = lobbyPlayers.filter(p => p.socketId !== socket.id);
      engine.removePlayer(socket.id);
      io.emit('lobbyUpdate', lobbyPlayers);
    }
  });

  socket.on("log", (VarName, value) => {
    console.log(`[Log] ${VarName}:`, value);
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