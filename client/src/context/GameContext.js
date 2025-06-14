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
  const [diceRoll, setDiceRoll] = useState(() => {
    const savedDiceRoll = localStorage.getItem('gameDiceRoll');
    return savedDiceRoll ? JSON.parse(savedDiceRoll) : null;
  });
  const [movementDone, setMovementDone] = useState(() => {
    const savedMovementDone = localStorage.getItem('gameMovementDone');
    return savedMovementDone ? JSON.parse(savedMovementDone) : false;
  });
  const [insufficientFunds, setInsufficientFunds] = useState(false);

  // Save important state to localStorage whenever it changes
  useEffect(() => {
    if (player) {
      const playerData = {
        ...player,
        piece: player.piece || null // Ensure piece is included
      };
      localStorage.setItem('gamePlayer', JSON.stringify(playerData));
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

  useEffect(() => {
    if (diceRoll) {
      localStorage.setItem('gameDiceRoll', JSON.stringify(diceRoll));
    } else {
      localStorage.removeItem('gameDiceRoll');
    }
  }, [diceRoll]);

  useEffect(() => {
    localStorage.setItem('gameMovementDone', JSON.stringify(movementDone));
  }, [movementDone]);

  // Auto-rejoin on refresh/reconnect
  useEffect(() => {
    const handleReconnect = () => {
      const savedPlayer = localStorage.getItem('gamePlayer');
      if (savedPlayer) {
        const playerData = JSON.parse(savedPlayer);
        console.log('[GameContext] Reconnecting with data:', {
          name: playerData.name,
          piece: playerData.piece,
          savedState: savedPlayer
        });
        
        socket.emit('joinLobby', { 
          name: playerData.name,
          piece: playerData.piece 
        });
      }
    };

    socket.on('connect', handleReconnect);
    return () => socket.off('connect', handleReconnect);
  }, [socket]);

  // Add piece state sync debugging
  useEffect(() => {
    if (socket?.id && players.length > 0) {
      const me = players.find(p => p.socketId === socket.id);
      console.log('[GameContext] Syncing player state:', {
        socketId: socket?.id,
        foundPlayer: !!me,
        piece: me?.piece,
        currentPiece: player?.piece
      });
      if (me) {
        setPlayer(prev => ({
          ...me,
          piece: me.piece || prev?.piece
        }));
      }
    }
  }, [players, socket?.id]);

  // Clear session data on quit
  const handleQuit = () => {
    localStorage.removeItem('gamePlayer');
    localStorage.removeItem('gameState');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('gameDiceRoll');
    localStorage.removeItem('gameMovementDone');
    setPlayer(null);
    setGameState('lobby');
    setSessionId(null);
    setDiceRoll(null);
    setMovementDone(false);
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

  // Utility to ensure each player has a piece field
  function ensurePiece(players, prevPlayers = []) {
    return players.map(p => {
      if (p.piece !== undefined) return p;
      // Try to preserve piece from previous state if possible
      const prev = prevPlayers.find(prevP => prevP.socketId === p.socketId);
      return { ...p, piece: prev?.piece ?? null };
    });
  }

  useEffect(() => {
    // LOBBY UPDATE
    socket.on('lobbyUpdate', updated => {
      setPlayers(prev => ensurePiece(updated, prev));
    });

    // GAME START
    socket.on('gameStart', ({ players: ps, sessionId: sid, currentPlayerId: cid }) => {
      setPlayers(prev => ensurePiece(ps, prev));
      setSessionId(sid);
      setGameState('playing');
      setCurrentPlayerId(cid);
      setDiceRoll(null);
      setMovementDone(false);
      setInsufficientFunds(false);
    });

    // GAME OVER
    socket.on('gameOver', ({ winner }) => {
      setGameState('lobby');
      setCurrentPlayerId(null);
      setDiceRoll(null);
      setMovementDone(false);
      setInsufficientFunds(false);
      localStorage.removeItem('gamePlayer');
      localStorage.removeItem('gameState');
      localStorage.removeItem('sessionId');
      localStorage.removeItem('gameDiceRoll');
      localStorage.removeItem('gameMovementDone');
    });

    // PLAYER QUIT
    socket.on('playerQuit', ({ playerName, temporary }) => {
      if (!temporary) {
        setPlayers(prev => prev.filter(p => p.name !== playerName));
        // If it's the current player who quit
        if (player?.name === playerName) {
          localStorage.removeItem('gamePlayer');
          localStorage.removeItem('gameState');
          localStorage.removeItem('sessionId');
          localStorage.removeItem('gameDiceRoll');
          localStorage.removeItem('gameMovementDone');
          setPlayer(null);
          setGameState('lobby');
          setSessionId(null);
          setDiceRoll(null);
          setMovementDone(false);
        }
      }
    });

    // TURN ENDED
    socket.on('turnEnded', ({ nextPlayerId }) => {
      console.log('[GameContext] Turn ended, next player:', nextPlayerId);
      setCurrentPlayerId(nextPlayerId);
      setDiceRoll(null);
      setMovementDone(false);
      setInsufficientFunds(false);
      
      // Clear turn-related localStorage
      localStorage.removeItem('gameDiceRoll');
      localStorage.removeItem('gameMovementDone');

      // If it's now our turn, ensure we start fresh
      if (socket.id === nextPlayerId) {
        console.log('[GameContext] It is now our turn');
        const currentPlayer = players.find(p => p.socketId === socket.id);
        if (currentPlayer) {
          currentPlayer.hasMoved = false;
        }
      }
    });

    // DICE RESULT
    socket.on('diceResult', ({ playerId, die1, die2, total }) => {
      setDiceRoll({ playerId, die1, die2, total });
    });

    // TILE MOVED
    socket.on('playerMoved', ({ playerId, tileId }) => {
      setPlayers(prev =>
        prev.map(p => 
          p.socketId === playerId 
            ? { ...p, tileId, piece: p.piece ?? null } 
            : p
        )
      );
      
      // Update current player's position if it's them
      if (player?.socketId === playerId) {
        setPlayer(prev => ({ ...prev, tileId, piece: prev?.piece ?? null }));
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

    socket.on('playersStateUpdate', ({ players }) => {
      setPlayers(players);
      // Update the current player's state if it matches
      const updatedPlayer = players.find(p => p.socketId === socket.id);
      if (updatedPlayer) {
        setPlayer(updatedPlayer);
      }
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
      socket.off('playersStateUpdate');
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