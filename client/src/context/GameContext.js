import React, { createContext, useState, useEffect } from 'react';
import socket from '../socket';

export const GameContext = createContext();

export function GameProvider({ children }) {
  // Initialize state from localStorage if available
  const [player, setPlayer] = useState(() => {
    const savedPlayer = localStorage.getItem('gamePlayer');
    return savedPlayer ? JSON.parse(savedPlayer) : null;
  });
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState(() => {
    const savedGameState = localStorage.getItem('gameState');
    return savedGameState || 'lobby';
  });
  const [sessionId, setSessionId] = useState(() => {
    const savedSessionId = localStorage.getItem('sessionId');
    return savedSessionId || null;
  });
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [diceRoll, setDiceRoll] = useState(null);
  const [movementDone, setMovementDone] = useState(false);
  const [insufficientFunds, setInsufficientFunds] = useState(false);

  // Save important state to localStorage whenever it changes
  useEffect(() => {
    if (player) {
      localStorage.setItem('gamePlayer', JSON.stringify(player));
    } else {
      localStorage.removeItem('gamePlayer');
    }
  }, [player]);

  useEffect(() => {
    if (gameState) {
      localStorage.setItem('gameState', gameState);
    } else {
      localStorage.removeItem('gameState');
    }
  }, [gameState]);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('sessionId', sessionId);
    } else {
      localStorage.removeItem('sessionId');
    }
  }, [sessionId]);

  // Auto-rejoin on refresh/reconnect
  useEffect(() => {
    const handleReconnect = () => {
      const savedPlayer = localStorage.getItem('gamePlayer');
      const savedGameState = localStorage.getItem('gameState');
      
      if (savedPlayer) {
        const playerData = JSON.parse(savedPlayer);
        // Emit joinLobby with the saved name to trigger reconnection
        socket.emit('joinLobby', { name: playerData.name });
      }
    };

    socket.on('connect', handleReconnect);

    // Initial connection check
    if (socket.connected && player) {
      handleReconnect();
    }

    return () => {
      socket.off('connect', handleReconnect);
    };
  }, [player]);

  // Clear session data on quit
  const handleQuit = () => {
    localStorage.removeItem('gamePlayer');
    localStorage.removeItem('gameState');
    localStorage.removeItem('sessionId');
    setPlayer(null);
    setGameState('lobby');
    setSessionId(null);
  };

  // Update player whenever players array changes
  useEffect(() => {
    if (socket?.id && players.length > 0) {
      const me = players.find(p => p.socketId === socket.id);
      if (me) {
        console.log('[GameContext] Updating player from players array:', {
          playerId: me.socketId,
          money: me.money
        });
        setPlayer(me);
      }
    }
  }, [players, socket?.id]);

  useEffect(() => {
    // LOBBY UPDATE
    socket.on('lobbyUpdate', updated => {
      setPlayers(updated);
    });

    // GAME START
    socket.on('gameStart', ({ players: ps, sessionId: sid, currentPlayerId: cid }) => {
      setPlayers(ps);
      setSessionId(sid);
      setGameState('playing');
      setCurrentPlayerId(cid);
      setDiceRoll(null);
      setMovementDone(false);
      setInsufficientFunds(false);
    });

    // Add game over handler
    socket.on('gameOver', ({ winner }) => {
      alert(`Game Over! ${winner} wins as the last player remaining!`);
      handleQuit(); // Clean up game state
    });

    // PLAYER QUIT
    socket.on('playerQuit', ({ playerName, temporary }) => {
      if (!temporary) {
        setPlayers(prev => prev.filter(p => p.name !== playerName));
      }
    });

    // TURN ENDED
    socket.on('turnEnded', ({ nextPlayerId }) => {
      setCurrentPlayerId(nextPlayerId);
      setDiceRoll(null);
      setMovementDone(false);
      setInsufficientFunds(false);
    });

    // DICE RESULT
    socket.on('diceResult', ({ playerId, die1, die2, total }) => {
      setDiceRoll({ playerId, die1, die2, total });
    });

    // TILE MOVED
    socket.on('playerMoved', ({ playerId, tileId }) => {
      setPlayers(prev =>
        prev.map(p => p.socketId === playerId ? { ...p, tileId } : p)
      );
      
      // Update current player's position if it's them
      if (player?.socketId === playerId) {
        setPlayer(prev => ({ ...prev, tileId }));
      }
    });

    // MOVEMENT DONE
    socket.on('movementDone', () => {
      setMovementDone(true);
    });

    // INSUFFICIENT FUNDS
    socket.on('insufficientFunds', () => {
      setInsufficientFunds(true);
    });

    // RENT PAID
    socket.on('rentPaid', ({ payerSocketId, payerMoney, payerLoan, ownerSocketId, ownerMoney }) => {
      console.log('[GameContext] Updating money after rent payment:', {
        payerSocketId,
        payerMoney,
        ownerSocketId,
        ownerMoney,
        currentPlayerSocketId: socket.id
      });
      
      // Update player state first if current player is involved
      if (socket.id === payerSocketId) {
        setPlayer(prev => ({ ...prev, money: payerMoney, loan: payerLoan }));
      } else if (socket.id === ownerSocketId) {
        setPlayer(prev => ({ ...prev, money: ownerMoney }));
      }

      // Then update all players' money
      setPlayers(prevPlayers => 
        prevPlayers.map(p => {
          if (p.socketId === payerSocketId) {
            return { ...p, money: payerMoney, loan: payerLoan };
          }
          if (p.socketId === ownerSocketId) {
            return { ...p, money: ownerMoney };
          }
          return p;
        })
      );
    });

    // RENT BONUS
    socket.on('rentBonus', ({ playerSocketId, newMoney }) => {
      console.log('[GameContext] Updating money after rent bonus:', {
        playerSocketId,
        newMoney,
        currentPlayerSocketId: socket.id
      });
      
      // Update players list
      setPlayers(prev => prev.map(p =>
        p.socketId === playerSocketId ? { ...p, money: newMoney } : p
      ));
    });

    // PROPERTY UPDATED (for buying/selling)
    socket.on('propertyUpdated', ({ playerId, propertyId, action, newMoney }) => {
      console.log('[GameContext] Property update:', { playerId, propertyId, action, newMoney });
      
      // Update current player first if they're involved
      if (player?.socketId === playerId) {
        setPlayer(prev => ({
          ...prev,
          money: newMoney,
          properties: action === 'add'
            ? [...(prev.properties || []), propertyId]
            : (prev.properties || []).filter(id => id !== propertyId)
        }));
      }

      // Then update all players
      setPlayers(prev => prev.map(p => {
        if (p.socketId === playerId) {
          return {
            ...p,
            money: newMoney,
            properties: action === 'add' 
              ? [...(p.properties || []), propertyId]
              : (p.properties || []).filter(id => id !== propertyId)
          };
        }
        return p;
      }));
    });

    // START BONUS
    socket.on('startBonus', ({ playerSocketId, newMoney, amount }) => {
      console.log('[GameContext] Updating money after start bonus:', {
        playerSocketId,
        newMoney,
        amount,
        currentPlayerSocketId: socket.id
      });
      
      // Update current player first if they got the bonus
      if (socket.id === playerSocketId) {
        setPlayer(prev => ({ ...prev, money: newMoney }));
      }

      // Then update all players
      setPlayers(prevPlayers => 
        prevPlayers.map(p => 
          p.socketId === playerSocketId ? { ...p, money: newMoney } : p
        )
      );
    });

    // CASINO RESULT
    socket.on('casinoResult', ({ playerId, playerMoney }) => {
      console.log('[GameContext] Updating money after casino result:', {
        playerId,
        playerMoney,
        currentPlayerSocketId: socket.id
      });
      
      // Update current player first if they're involved
      if (socket.id === playerId) {
        setPlayer(prev => ({ ...prev, money: playerMoney }));
      }

      // Then update all players
      setPlayers(prevPlayers => 
        prevPlayers.map(p => 
          p.socketId === playerId ? { ...p, money: playerMoney } : p
        )
      );
    });

    // ROAD CASH
    socket.on('roadCashResult', ({ playerSocketId, newMoney, amount }) => {
      console.log('[GameContext] Updating money after road cash:', {
        playerSocketId,
        newMoney,
        amount,
        currentPlayerSocketId: socket.id
      });
      
      // Update current player first if they got the money
      if (socket.id === playerSocketId) {
        setPlayer(prev => ({ ...prev, money: newMoney }));
      }

      // Then update all players
      setPlayers(prevPlayers => 
        prevPlayers.map(p => 
          p.socketId === playerSocketId ? { ...p, money: newMoney } : p
        )
      );
    });

    // Add loan handling
    socket.on('loanUpdated', ({ playerId, newMoney, loanAmount }) => {
      console.log('[GameContext] Loan update:', { playerId, newMoney, loanAmount });
      
      // Update current player first if they're involved
      if (player?.socketId === playerId) {
        setPlayer(prev => ({
          ...prev,
          money: newMoney,
          loan: loanAmount
        }));
      }

      // Then update all players
      setPlayers(prev => prev.map(p => {
        if (p.socketId === playerId) {
          return {
            ...p,
            money: newMoney,
            loan: loanAmount
          };
        }
        return p;
      }));
    });

    // TRADE ACCEPTED
    socket.on('tradeAccepted', ({ fromPlayer, toPlayer }) => {
      console.log('[GameContext] Updating after trade accepted:', {
        fromPlayer,
        toPlayer,
        currentPlayerSocketId: socket.id
      });

      // Update current player first if they were involved
      if (socket.id === fromPlayer.socketId) {
        setPlayer(prev => ({ 
          ...prev, 
          money: fromPlayer.money, 
          properties: fromPlayer.properties 
        }));
      } else if (socket.id === toPlayer.socketId) {
        setPlayer(prev => ({ 
          ...prev, 
          money: toPlayer.money, 
          properties: toPlayer.properties 
        }));
      }

      // Then update all players
      setPlayers(prevPlayers => 
        prevPlayers.map(p => {
          if (p.socketId === fromPlayer.socketId) {
            return { 
              ...p, 
              money: fromPlayer.money, 
              properties: fromPlayer.properties 
            };
          }
          if (p.socketId === toPlayer.socketId) {
            return { 
              ...p, 
              money: toPlayer.money, 
              properties: toPlayer.properties 
            };
          }
          return p;
        })
      );
    });

    return () => {
      socket.off('lobbyUpdate');
      socket.off('gameStart');
      socket.off('gameOver');
      socket.off('playerQuit');
      socket.off('turnEnded');
      socket.off('diceResult');
      socket.off('playerMoved');
      socket.off('movementDone');
      socket.off('insufficientFunds');
      socket.off('rentPaid');
      socket.off('rentBonus');
      socket.off('propertyUpdated');
      socket.off('startBonus');
      socket.off('casinoResult');
      socket.off('roadCashResult');
      socket.off('loanUpdated');
      socket.off('tradeAccepted');
    };
  }, [socket?.id, player]);

  return (
    <GameContext.Provider
      value={{
        player,
        setPlayer,
        players,
        setPlayers,
        currentPlayerId,
        setCurrentPlayerId,
        sessionId,
        setSessionId,
        socket,
        gameState,
        setGameState,
        diceRoll,
        setDiceRoll,
        movementDone,
        setMovementDone,
        insufficientFunds,
        setInsufficientFunds,
        handleQuit
      }}
    >
      {children}
    </GameContext.Provider>
  );
}