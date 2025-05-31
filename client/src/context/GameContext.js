import React, { createContext, useState, useEffect } from 'react';
import socket from '../socket';

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
    socket.on('startBonus', ({ playerSocketId, newMoney }) => {
      // Update current player first if they got the bonus
      if (player?.socketId === playerSocketId) {
        setPlayer(prev => ({ ...prev, money: newMoney }));
      }

      // Then update all players
      setPlayers(prev => prev.map(p =>
        p.socketId === playerSocketId ? { ...p, money: newMoney } : p
      ));
    });

    // CASINO RESULT
    socket.on('casinoResult', ({ playerId, playerMoney }) => {
      // Update current player first if they're involved
      if (player?.socketId === playerId) {
        setPlayer(prev => ({ ...prev, money: playerMoney }));
      }

      // Then update all players
      setPlayers(prev => prev.map(p =>
        p.socketId === playerId ? { ...p, money: playerMoney } : p
      ));
    });

    // ROAD CASH RESULT
    socket.on('roadCashResult', ({ playerSocketId, newMoney }) => {
      // Update current player first if they got the money
      if (player?.socketId === playerSocketId) {
        setPlayer(prev => ({ ...prev, money: newMoney }));
      }

      // Then update all players
      setPlayers(prev => prev.map(p =>
        p.socketId === playerSocketId ? { ...p, money: newMoney } : p
      ));
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
      }}
    >
      {children}
    </GameContext.Provider>
  );
}