import React, { createContext, useState, useEffect } from 'react';
import socket from '../socket';

export const GameContext = createContext();

export function GameProvider({ children }) {
  
  const [isRpsActive, setIsRpsActive] = useState(false);
  
  const [chatMessages, setChatMessages] = useState(() => {
    const savedChat = localStorage.getItem('gameChatMessages');
    return savedChat ? JSON.parse(savedChat) : [];
  });
  
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
  
  const [done, setDone] = useState(() => {
    const savedDone = localStorage.getItem('gameDoneState');
    return savedDone ? JSON.parse(savedDone) : false;
  });
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  
  const [activeLoans, setActiveLoans] = useState([]);
  const [loanRequests, setLoanRequests] = useState([]);
  
  const fetchLoans = () => {
    if (socket) {
      socket.emit('getActiveLoans');
      socket.emit('getPendingLoanRequests');
    }
  };
  
  const requestLoan = (lenderId, amount, returnAmount) => {
    if (socket) {
      socket.emit('requestLoan', { lenderId, amount, returnAmount });
    }
  };
  
  const respondToLoan = (loanId, accepted) => {
    if (socket) {
      socket.emit(accepted ? 'acceptLoan' : 'rejectLoan', { loanId });
    }
  };
  
  const repayLoan = (loanId) => {
    if (socket) {
      socket.emit('repayLoan', { loanId });
    }
  };
  
  useEffect(() => {
    if (!socket) return;
    function handleChatMessage(message) {
      setChatMessages(prev => [...prev, message]);
    }
    socket.on('chatMessage', handleChatMessage);
    return () => {
      socket.off('chatMessage', handleChatMessage);
    };
  }, []); 


  useEffect(() => {
    if (!socket) {
      console.log('GameContext: Socket not available');
      return;
    }
    
    const handleLobbyState = (players) => {
      console.log('Received lobby state update:', players);
      setPlayers(players || []);
      
      if (player) {
        const updatedPlayer = players?.find(p => p.socketId === player.socketId);
        if (updatedPlayer) {
          setPlayer(prev => ({
            ...prev,
            ...updatedPlayer
          }));
        }
      }
    };
    
    const handleRpsStarted = () => setIsRpsActive(true);
    const handleRpsEnded = () => setIsRpsActive(false);
    
    const handlePlayerDiceRoll = (data) => {
      console.log('GameContext: Received playerDiceRoll event:', data);
      console.log('GameContext: Current socket ID:', socket.id);
      console.log('GameContext: Event player ID:', data.playerId);
      console.log('GameContext: Forwarding as forwardedPlayerDiceRoll');
      socket.emit('forwardedPlayerDiceRoll', data);
      console.log('GameContext: Current socket event listeners:', {
        events: socket._callbacks ? Object.keys(socket._callbacks) : 'No callbacks',
        hasForwardedListener: socket._callbacks?.forwardedPlayerDiceRoll ? 'Yes' : 'No'
      });
    };

    const handlePlayerMoneyUpdate = (data) => {
      console.log('GameContext: Received playerMoneyUpdate event:', data);
      setPlayer(prev => ({ ...prev, money: data.money }));
    };

    socket.on('lobbyState', handleLobbyState);
    socket.on('rpsStarted', handleRpsStarted);
    socket.on('rpsEnded', handleRpsEnded);
    socket.on('playerMoneyUpdate', handlePlayerMoneyUpdate);
    socket.on('playerDiceRoll', handlePlayerDiceRoll);
    
    socket.emit('requestLobbyState');
    
    socket.on('activeLoans', (loans) => {
      setActiveLoans(loans || []);
    });
    
    socket.on('pendingLoanRequests', (requests) => {
      setLoanRequests(requests || []);
    });
    
    socket.on('loanRequest', (request) => {
      setLoanRequests(prev => {
        if (prev.some(req => req.id === request.id)) return prev;
        return [...prev, request];
      });
    });

    socket.on('loanAccepted', ({ loan, borrowerUpdate, lenderUpdate }) => {
      console.log('Loan accepted:', loan);
      
      setActiveLoans(prev => {
        const updatedLoans = prev.filter(l => l.id !== loan.id);
        if (!updatedLoans.some(l => l.id === loan.id)) {
          return [...updatedLoans, loan];
        }
        return updatedLoans;
      });

      setLoanRequests(prev => prev.filter(req => req.id !== loan.id));

      if (socket.id === borrowerUpdate.playerId) {
        setPlayer(prev => ({
          ...prev,
          money: borrowerUpdate.newMoney
        }));
      } else if (socket.id === lenderUpdate.playerId) {
        setPlayer(prev => ({
          ...prev,
          money: lenderUpdate.newMoney
        }));
      }

      setPlayers(prev => 
        prev.map(p => {
          if (p.socketId === borrowerUpdate.playerId) {
            return { ...p, money: borrowerUpdate.newMoney };
          }
          if (p.socketId === lenderUpdate.playerId) {
            return { ...p, money: lenderUpdate.newMoney };
          }
          return p;
        })
      );
    });
    
    socket.on('loanRejected', ({ loanId, reason }) => {
      console.log(`Loan ${loanId} rejected:`, reason);
      
      setLoanRequests(prev => prev.filter(req => req.id !== loanId));
    });

    socket.on('loanRepaid', ({ loan, playerUpdate }) => {
      console.log('Loan repaid:', loan);
      
      setActiveLoans(prev => prev.filter(l => l.id !== loan.id));

      if (socket.id === playerUpdate.playerId) {
        setPlayer(prev => ({
          ...prev,
          money: playerUpdate.newMoney
        }));
      }

      setPlayers(prev => 
        prev.map(p => {
          if (p.socketId === playerUpdate.playerId) {
            return { ...p, money: playerUpdate.newMoney };
          }
          return p;
        })
      );
    });
    
    fetchLoans();

    return () => {
      socket.off('lobbyState', handleLobbyState);
      socket.off('rpsStarted', handleRpsStarted);
      socket.off('rpsEnded', handleRpsEnded);
      socket.off('playerMoneyUpdate', handlePlayerMoneyUpdate);
      socket.off('playerDiceRoll', handlePlayerDiceRoll);
      socket.off('activeLoans');
      socket.off('pendingLoanRequests');
      socket.off('loanRequest');
    };
  }, []);

  
  useEffect(() => {
    if (player) {
      const playerData = {
        ...player,
        piece: player.piece || null 
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

  
  useEffect(() => {
    const handleReconnect = () => {
      const savedPlayer = localStorage.getItem('gamePlayer');
      if (savedPlayer) {
        const playerData = JSON.parse(savedPlayer);
        
        socket.emit('joinLobby', { 
          name: playerData.name,
          piece: playerData.piece 
        });
      }
    };

    socket.on('connect', handleReconnect);
    return () => socket.off('connect', handleReconnect);
  }, []); 

  useEffect(() => {
    if (socket?.id && players.length > 0) {
      const me = players.find(p => p.socketId === socket.id);
      
      if (me) {
        setPlayer(prev => ({
          ...me,
          piece: me.piece || prev?.piece
        }));
      }
    }
  }, [players]); 

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

  useEffect(() => {
    if (socket?.id && players.length > 0) {
      const me = players.find(p => p.socketId === socket.id);
      if (me) {
        setPlayer(me);
      }
    }
  }, [players]); 

  function ensurePiece(players, prevPlayers = []) {
    return players.map(p => {
      if (p.piece !== undefined) return p;
      const prev = prevPlayers.find(prevP => prevP.socketId === p.socketId);
      return { ...p, piece: prev?.piece ?? null };
    });
  }

  useEffect(() => {
    socket.on('lobbyUpdate', updated => {
      setPlayers(prev => ensurePiece(updated, prev));
    });
    socket.on('gameStart', ({ players: ps, sessionId: sid, currentPlayerId: cid, turnOrder }) => {
      setPlayers(prev => ensurePiece(ps, prev));
      setSessionId(sid);
      setGameState('playing');
      
      // Add turn order message to chat
      if (turnOrder && turnOrder.length > 0) {
        const turnOrderMessage = {
          message: `Game starting! Turn order: ${turnOrder.join(', ')}`,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => {
          const updated = [...prev, turnOrderMessage];
          localStorage.setItem('gameChatMessages', JSON.stringify(updated));
          return updated;
        });
      }
      setCurrentPlayerId(cid);
      setDiceRoll(null);
      setMovementDone(false);
      setInsufficientFunds(false);
    });

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

    socket.on('playerQuit', ({ playerName, temporary }) => {
      if (!temporary) {
        setPlayers(prev => prev.filter(p => p.name !== playerName));
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

    socket.on('turnEnded', ({ nextPlayerId }) => {
      setCurrentPlayerId(nextPlayerId);
      setDiceRoll(null);
      setMovementDone(false);
      setInsufficientFunds(false);
      
      localStorage.removeItem('gameDiceRoll');
      localStorage.removeItem('gameMovementDone');

      if (socket.id === nextPlayerId) {
        const currentPlayer = players.find(p => p.socketId === socket.id);
        if (currentPlayer) {
          currentPlayer.hasMoved = false;
        }
      }
    });

    socket.on('diceResult', ({ playerId, die1, die2, total }) => {
      setDiceRoll({ playerId, die1, die2, total });
    });
    socket.on('playerMoved', ({ playerId, tileId }) => {
      setPlayers(prev =>
        prev.map(p => 
          p.socketId === playerId 
            ? { ...p, tileId, piece: p.piece ?? null } 
            : p
        )
      );
      
      if (player?.socketId === playerId) {
        setPlayer(prev => ({ ...prev, tileId, piece: prev?.piece ?? null }));
      }
    });
    socket.on('movementDone', () => {
      setMovementDone(true);
    });
    socket.on('insufficientFunds', () => {
      setInsufficientFunds(true);
    });
    socket.on('rentPaid', ({ payerSocketId, payerMoney, payerLoan, ownerSocketId, ownerMoney }) => {
      if (socket.id === payerSocketId) {
        setPlayer(prev => ({ ...prev, money: payerMoney, loan: payerLoan }));
      } else if (socket.id === ownerSocketId) {
        setPlayer(prev => ({ ...prev, money: ownerMoney }));
      }
      
      if (socket.id === payerSocketId) {
        setPlayer(prev => ({ ...prev, money: payerMoney, loan: payerLoan }));
      } else if (socket.id === ownerSocketId) {
        setPlayer(prev => ({ ...prev, money: ownerMoney }));
      }

      
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
    socket.on('rentBonus', ({ playerSocketId, newMoney }) => {
      if (socket.id === playerSocketId) {
        setPlayer(prev => ({ ...prev, money: newMoney }));
      }
      
      setPlayers(prev => prev.map(p =>
        p.socketId === playerSocketId ? { ...p, money: newMoney } : p
      ));
    });

    socket.on('propertyUpdated', ({ playerId, propertyId, action, newMoney }) => {
      
      
      if (player?.socketId === playerId) {
        setPlayer(prev => ({
          ...prev,
          money: newMoney,
          properties: action === 'add'
            ? [...(prev.properties || []), propertyId]
            : (prev.properties || []).filter(id => id !== propertyId)
        }));
      }

      
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

    socket.on('startBonus', ({ playerSocketId, newMoney, amount }) => {
      
      if (socket.id === playerSocketId) {
        setPlayer(prev => ({ ...prev, money: newMoney }));
      }

      
      setPlayers(prevPlayers => 
        prevPlayers.map(p => 
          p.socketId === playerSocketId ? { ...p, money: newMoney } : p
        )
      );
    });

    socket.on('casinoResult', ({ playerId, playerMoney }) => {
      if (socket.id === playerId) {
        setPlayer(prev => ({ ...prev, money: playerMoney }));
      }
      
      
      if (socket.id === playerId) {
        setPlayer(prev => ({ ...prev, money: playerMoney }));
      }

      
      setPlayers(prevPlayers => 
        prevPlayers.map(p => 
          p.socketId === playerId ? { ...p, money: playerMoney } : p
        )
      );
    });

    socket.on('roadCashResult', ({ playerSocketId, newMoney, amount }) => {

      if (socket.id === playerSocketId) {
        setPlayer(prev => ({ ...prev, money: newMoney }));
      }
    
      setPlayers(prevPlayers => 
        prevPlayers.map(p => 
          p.socketId === playerSocketId ? { ...p, money: newMoney } : p
        )
      );
    });

    socket.on('loanUpdated', ({ playerId, newMoney, loanAmount }) => {
      
      if (player?.socketId === playerId) {
        setPlayer(prev => ({
          ...prev,
          money: newMoney,
          loan: loanAmount
        }));
      }

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
      
      const updatedPlayer = players.find(p => p.socketId === socket.id);
      if (updatedPlayer) {
        setPlayer(updatedPlayer);
      }
    });

    socket.on('playerMoneyUpdate', ({ playerId, newMoney, playerName }) => {
      console.log(`Updating money for player ${playerName || playerId} to ${newMoney}`);
      
      setPlayers(prevPlayers => 
        prevPlayers.map(p => 
          p.socketId === playerId 
            ? { ...p, money: newMoney }
            : p
        )
      );
      
      if (playerId === socket.id) {
        setPlayer(prev => ({
          ...prev,
          money: newMoney
        }));
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
      socket.off('playerMoneyUpdate');
    };
  }, [player, players]);

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
        done,
        setDone,
        insufficientFunds,
        setInsufficientFunds,
        chatMessages,
        setChatMessages,
        isRpsActive,
        activeLoans,
        loanRequests,
        fetchLoans,
        requestLoan,
        respondToLoan,
        repayLoan,
        setIsRpsActive,
        handleQuit
      }}
    >
      {children}
    </GameContext.Provider>
  );
}