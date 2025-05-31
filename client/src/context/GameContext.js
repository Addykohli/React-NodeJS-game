import React, { createContext, useState, useEffect } from 'react';
import socket from '../socket';
import Cookies from 'js-cookie';

export const GameContext = createContext();

export function GameProvider({ children }) {
  const [player, setPlayer]               = useState(null);
  const [players, setPlayers]             = useState([]);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [sessionId, setSessionId]         = useState(null);
  const [gameState, setGameState]         = useState('lobby');

  // dice + movement flags
  const [diceRoll, setDiceRoll]           = useState(null);
  const [movementDone, setMovementDone]   = useState(false);

  // buy/rent UI
  const [insufficientFunds, setInsufficientFunds] = useState(false);

  // Load session from cookie on initial mount
  useEffect(() => {
    const savedSession = Cookies.get('gameSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.playerName) {
          // Attempt to reconnect with saved name
          socket.emit('joinLobby', { name: session.playerName });
        }
      } catch (err) {
        console.error('Error parsing saved session:', err);
        Cookies.remove('gameSession');
      }
    }
  }, []);

  // Save session to cookie whenever relevant state changes
  useEffect(() => {
    if (player?.name && gameState) {
      const sessionData = {
        playerName: player.name,
        gameState: gameState
      };
      Cookies.set('gameSession', JSON.stringify(sessionData), { expires: 1 }); // Expires in 1 day
    }
  }, [player?.name, gameState]);

  // Clear session cookie on game leave
  const handleGameLeave = () => {
    Cookies.remove('gameSession');
    setGameState('lobby');
    setPlayer(null);
    setPlayers([]);
    setCurrentPlayerId(null);
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
    socket.on('rentPaid', ({ payerSocketId, payerMoney, ownerSocketId, ownerMoney }) => {
      console.log('[GameContext] Updating money after rent payment:', {
        payerSocketId,
        payerMoney,
        ownerSocketId,
        ownerMoney,
        currentPlayerSocketId: socket.id
      });
      
      // Update all players' money
      setPlayers(prev => prev.map(p => {
        if (p.socketId === payerSocketId) return { ...p, money: payerMoney };
        if (p.socketId === ownerSocketId) return { ...p, money: ownerMoney };
        return p;
      }));
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
      
      // Update players list
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

      // Update current player if it's them
      if (player?.socketId === playerId) {
        setPlayer(prev => ({
          ...prev,
          money: newMoney,
          properties: action === 'add'
            ? [...(prev.properties || []), propertyId]
            : (prev.properties || []).filter(id => id !== propertyId)
        }));
      }
    });

    // START BONUS
    socket.on('startBonus', ({ playerSocketId, newMoney }) => {
      // Update players list
      setPlayers(prev => prev.map(p =>
        p.socketId === playerSocketId ? { ...p, money: newMoney } : p
      ));

      // Update current player if it's them
      if (player?.socketId === playerSocketId) {
        setPlayer(prev => ({ ...prev, money: newMoney }));
      }
    });

    // CASINO RESULT
    socket.on('casinoResult', ({ playerId, playerMoney }) => {
      // Update players list
      setPlayers(prev => prev.map(p =>
        p.socketId === playerId ? { ...p, money: playerMoney } : p
      ));

      // Update current player if it's them
      if (player?.socketId === playerId) {
        setPlayer(prev => ({ ...prev, money: playerMoney }));
      }
    });

    // ROAD CASH RESULT
    socket.on('roadCashResult', ({ playerSocketId, newMoney }) => {
      // Update players list
      setPlayers(prev => prev.map(p =>
        p.socketId === playerSocketId ? { ...p, money: newMoney } : p
      ));

      // Update current player if it's them
      if (player?.socketId === playerSocketId) {
        setPlayer(prev => ({ ...prev, money: newMoney }));
      }
    });

    // Add loan handling
    socket.on('loanUpdated', ({ playerId, newMoney, loanAmount }) => {
      console.log('[GameContext] Loan update:', { playerId, newMoney, loanAmount });
      
      // Update players list
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

      // Update current player if it's them
      if (player?.socketId === playerId) {
        setPlayer(prev => ({
          ...prev,
          money: newMoney,
          loan: loanAmount
        }));
      }
    });

    socket.on('tradeAccepted', ({ fromPlayer, toPlayer }) => {
      setPlayers(prev => prev.map(p => {
        if (p.socketId === fromPlayer.socketId) {
          return { ...p, money: fromPlayer.money, properties: fromPlayer.properties };
        }
        if (p.socketId === toPlayer.socketId) {
          return { ...p, money: toPlayer.money, properties: toPlayer.properties };
        }
        return p;
      }));

      // Update current player if they were involved in the trade
      if (player?.socketId === fromPlayer.socketId) {
        setPlayer(prev => ({ ...prev, money: fromPlayer.money, properties: fromPlayer.properties }));
      } else if (player?.socketId === toPlayer.socketId) {
        setPlayer(prev => ({ ...prev, money: toPlayer.money, properties: toPlayer.properties }));
      }
    });

    // Handle player left event
    socket.on('playerLeft', () => {
      // If all players have left, clear the session
      if (players.length <= 1) {
        handleGameLeave();
      }
    });

    return () => {
      socket.off('lobbyUpdate');
      socket.off('gameStart');
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
      socket.off('playerLeft');
    };
  }, [socket?.id, player, players]);

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
        handleGameLeave, // Expose the handleGameLeave function
      }}
    >
      {children}
    </GameContext.Provider>
  );
}