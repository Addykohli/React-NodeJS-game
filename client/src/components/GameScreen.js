import React, { useContext, useState, useEffect } from 'react';
import bgImage from '../assets/bg.png';
import Dicebox from '../assets/diceBoard.png';
import startIcon from '../assets/start.png';
import hotelIcon from '../assets/hotel.png';
import casinoIcon from '../assets/casino.png';
import roadIcon from '../assets/road.png';
import Board from './Board';
import DiceRoller from './DiceRoller';
import Dashboard from './Dashboard';
import PlayerStats from './PlayerStats';
import RoadCash from './RoadCash';
import RPSTieResolver from './RPSTieResolver';
import { GameContext } from '../context/GameContext';
import { tiles } from '../data/tiles';
import Chat from './Chat';
import TradePanel from './TradePanel';

const CasinoBetting = ({ isMyTurn, currentMoney, socket, player, onCasinoPlayed }) => {
  const [betAmount, setBetAmount] = useState(1000);
  const [selectedBet, setSelectedBet] = useState(null);
  const [showResult, setShowResult] = useState(null);
  const [diceResult, setDiceResult] = useState(null);
  const [isActive, setIsActive] = useState(true);

  const handleAmountChange = (delta) => {
    const newAmount = Math.max(1000, Math.min(currentMoney, betAmount + delta));
    setBetAmount(newAmount);
  };

  const handleBetSelect = (bet) => {
    setSelectedBet(bet);
  };

  const handleRoll = () => {
    if (selectedBet && betAmount >= 1000 && betAmount <= currentMoney) {
      socket.emit('casinoRoll', { betAmount, betType: selectedBet });
    }
  };

  useEffect(() => {
    const handleCasinoResult = ({ playerId, dice, amount, won, playerMoney }) => {
      if (playerId === player.socketId) {
        setDiceResult(dice);
        setShowResult({ won, amount });
        setIsActive(false);
        onCasinoPlayed();
      }
    };

    socket.on('casinoResult', handleCasinoResult);
    return () => socket.off('casinoResult', handleCasinoResult);
  }, [socket, player.socketId, onCasinoPlayed]);

  // If not active (after result), show result screen
  if (!isActive) {
    if (showResult && diceResult) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '15px',
          padding: '20px'
        }}>
          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center'
          }}>
            <img 
              src={`/dice/dice${diceResult[0]}.png`} 
              alt={`Die ${diceResult[0]}`} 
              width={60}
              height={60}
            />
            <img 
              src={`/dice/dice${diceResult[1]}.png`} 
              alt={`Die ${diceResult[1]}`} 
              width={60}
              height={60}
            />
          </div>
          <div style={{
            color: showResult.won ? '#4CAF50' : '#f44336',
            fontWeight: 'bold',
            fontSize: '1.2em',
            padding: '10px 15px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            {showResult.won ? `You won $${showResult.amount}!` : `You lost $${showResult.amount}`}
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '100%',
      padding: '15px',
      gap: '10px'
    }}>
      {/* Money Input */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100%',
        padding: '15px',
        gap: '10px'
      }}>
        {/* Remove the Casino Betting title and start directly with money input */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <button
            onClick={() => handleAmountChange(-500)}
            disabled={!isMyTurn || betAmount <= 1000}
            style={{
              padding: '6px 12px',
              fontSize: '1.2em',
              cursor: isMyTurn ? 'pointer' : 'not-allowed',
              backgroundColor: isMyTurn && betAmount > 1000 ? '#ff4444' : 'rgba(255, 68, 68, 0.5)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              width: '36px',
              transition: 'all 0.2s ease'
            }}
          >
            -
          </button>
          <div style={{
            padding: '6px 12px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            minWidth: '100px',
            textAlign: 'center',
            fontSize: '1.1em',
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.2)'
          }}>
            ${betAmount}
          </div>
          <button
            onClick={() => handleAmountChange(500)}
            disabled={!isMyTurn || betAmount >= currentMoney}
            style={{
              padding: '6px 12px',
              fontSize: '1.2em',
              cursor: isMyTurn ? 'pointer' : 'not-allowed',
              backgroundColor: isMyTurn && betAmount < currentMoney ? '#4CAF50' : 'rgba(76, 175, 80, 0.5)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              width: '36px',
              transition: 'all 0.2s ease'
            }}
          >
            +
          </button>
        </div>

        {/* Bet type buttons */}
        <div style={{
          display: 'flex',
          gap: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          padding: '8px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {[
            { type: 'below', label: '2-6', odds: '2x' },
            { type: '7', label: '7', odds: '3x' },
            { type: 'above', label: '8-12', odds: '2x' }
          ].map(bet => (
            <button
              key={bet.type}
              onClick={() => handleBetSelect(bet.type)}
              disabled={!isMyTurn}
              style={{
                padding: '8px 12px',
                backgroundColor: selectedBet === bet.type ? '#2196F3' : 'rgba(33, 150, 243, 0.3)',
                color: '#fff',
                border: selectedBet === bet.type ? '2px solid #90CAF9' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                cursor: isMyTurn ? 'pointer' : 'not-allowed',
                fontSize: '0.9em',
                fontWeight: 'bold',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                minWidth: '70px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{bet.label}</span>
              <span style={{ 
                fontSize: '0.8em',
                opacity: 0.8 
              }}>{bet.odds}</span>
            </button>
          ))}
        </div>

        {/* Roll button */}
        <button
          onClick={handleRoll}
          disabled={!isMyTurn || !selectedBet || betAmount < 1000 || betAmount > currentMoney}
          style={{
            padding: '10px 30px',
            backgroundColor: isMyTurn && selectedBet && betAmount >= 1000 && betAmount <= currentMoney 
              ? '#FFA000' 
              : 'rgba(255, 160, 0, 0.3)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: isMyTurn && selectedBet ? 'pointer' : 'not-allowed',
            fontSize: '1.2em',
            fontWeight: 'bold',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            transition: 'all 0.3s ease',
            boxShadow: isMyTurn && selectedBet ? '0 2px 8px rgba(255, 160, 0, 0.4)' : 'none',
            width: '100%'
          }}
        >
          Roll Dice
        </button>

        {/* Current money display */}
        <div style={{
          fontSize: '0.9em',
          color: '#aaa',
          textAlign: 'center'
        }}>
          Your Money: ${currentMoney.toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default function GameScreen() {
  const {
    player,
    players,
    setPlayer,
    setPlayers,
    currentPlayerId,
    socket,
    movementDone,
    handleQuit
  } = useContext(GameContext);

  const isMyTurn = player?.socketId === currentPlayerId;
  const [error, setError] = useState(null);
  const [testRollInput, setTestRollInput] = useState('');
  const [testRollMode, setTestRollMode] = useState(false);
  const [inCasino, setInCasino] = useState(false);
  const [hasCasinoPlayed, setHasCasinoPlayed] = useState(false);
  const [hasChosenCorner, setHasChosenCorner] = useState(false);
  const [rpsGame, setRpsGame] = useState(null);
  const [rpsChoice, setRpsChoice] = useState(null);
  const [rpsResult, setRpsResult] = useState(null);
  const [rpsTieAmount, setRpsTieAmount] = useState(null);
  const [activeSidePanel, setActiveSidePanel] = useState(null);
  const [borrowAmount, setBorrowAmount] = useState(1000);
  const [payoffAmount, setPayoffAmount] = useState(1000);
  const [gameEvents, setGameEvents] = useState([]);

  // Add socket event listener for borrow response
  useEffect(() => {
    if (!socket) return;

    const handleBorrowResponse = ({ success, error }) => {
      if (!success && error) {
        setError(error);
        setTimeout(() => setError(null), 5000);
      }
    };

    socket.on('borrowResponse', handleBorrowResponse);

    return () => {
      socket.off('borrowResponse', handleBorrowResponse);
    };
  }, [socket]);

  // Add socket event listener for game events
  useEffect(() => {
    if (!socket) return;

    // Handle initial game events history
    socket.on('gameEventsHistory', (events) => {
      setGameEvents(events);
    });

    // Handle new game events
    socket.on('gameEvent', (event) => {
      setGameEvents(prev => [...prev, event]);
    });

    return () => {
      socket.off('gameEventsHistory');
      socket.off('gameEvent');
    };
  }, [socket]);

  // Define panel configurations
  const panelConfigs = {
    info: {
      color: '#4CAF50', // Green
      title: 'Game Events',
      icon: '📋'
    },
    bank: {
      color: '#2196F3', // Blue
      title: 'Bank',
      icon: '💰'
    },
    chat: {
      color: '#9C27B0', // Purple
      title: 'Chat',
      icon: '💬'
    },
    trade: {
      color: '#FF9800', // Orange
      title: 'Trade',
      icon: '🔄'
    }
  };

  // Determine metadata for the current tile
  const tileMeta = tiles.find(t => t.id === player?.tileId);

  // Reset hasChosenCorner when turn ends or tile changes
  useEffect(() => {
    if (!isMyTurn || !tileMeta?.name?.toLowerCase().includes('choose corner')) {
      setHasChosenCorner(false);
    }
  }, [isMyTurn, tileMeta]);

  // Add keyboard listener for test rolls
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isMyTurn) return;

      // Build up the test roll input
      if (e.key === 'Enter' && testRollInput.startsWith('testroll')) {
        const rollNumber = parseInt(testRollInput.slice(8));
        if (!isNaN(rollNumber) && rollNumber >= 2 && rollNumber <= 12) {
          socket.emit('rollDice', { testRoll: rollNumber });
          setTestRollInput('');
          setTestRollMode(false);
        }
      } else if (e.key === 'Backspace') {
        setTestRollInput(prev => prev.slice(0, -1));
      } else if (e.key.length === 1) { // Regular character
        setTestRollInput(prev => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isMyTurn, testRollInput, socket]);

  // Show current test roll input if active
  useEffect(() => {
    if (testRollInput.startsWith('testroll')) {
      setTestRollMode(true);
    } else if (testRollInput.length === 0) {
      setTestRollMode(false);
    }
  }, [testRollInput]);

  // Debug logging to trace condition
  useEffect(() => {
    console.log('[GameScreen] Debug:', {
      isMyTurn,
      movementDone,
      tileMeta,
      "player.tileId": player?.tileId,
      "tileMeta.type": tileMeta?.type,
      "tileMeta.cost": tileMeta?.cost,
      "player.money": player?.money,
      testRollMode,
      testRollInput
    });
  }, [isMyTurn, movementDone, tileMeta, player, testRollMode, testRollInput]);

  // Listen for purchase events
  useEffect(() => {
    socket.on('purchaseSuccess', ({ socketId, money, properties }) => {
      console.log('[GameScreen] purchaseSuccess', { socketId, money, properties });
      const updated = players.map(p =>
        p.socketId === socketId ? { ...p, money, properties } : p
      );
      setPlayers(updated);
      if (player.socketId === socketId) {
        setPlayer({ ...player, money, properties });
      }
      setError(null);
    });

    // Add player disconnect handler
    socket.on('playerDisconnected', ({ playerName, temporary }) => {
      if (temporary) {
        setError(`${playerName} temporarily disconnected. They can rejoin with the same name.`);
        setTimeout(() => setError(null), 5000);
      }
      else {
        setError(`${playerName} has quit the game.`);
        setTimeout(() => setError(null), 5000);
      }
    });

    // Add property update handler
    socket.on('propertyUpdated', ({ playerId, propertyId, action, newMoney }) => {
      console.log('[GameScreen] propertyUpdated', { playerId, propertyId, action, newMoney });
      
      // Update players' properties and money
      setPlayers(prevPlayers => {
        return prevPlayers.map(p => {
          if (p.socketId === playerId) {
            return {
              ...p,
              properties: action === 'add'
                ? [...(p.properties || []), propertyId]
                : (p.properties || []).filter(id => id !== propertyId),
              money: newMoney // Update the player's money
            };
          }
          return p;
        });
      });

      // Update current player if they're involved
      if (player.socketId === playerId) {
        setPlayer(prev => ({
          ...prev,
          properties: action === 'add'
            ? [...(prev.properties || []), propertyId]
            : (prev.properties || []).filter(id => id !== propertyId),
          money: newMoney // Update the current player's money
        }));

        // Show message when selling property
        if (action === 'remove') {
          const property = tiles.find(t => t.id === propertyId);
          setError(`You sold ${property.name} for $${property.cost}`);
          setTimeout(() => setError(null), 5000);
        }
      }
    });

    // Add rent payment handler
    socket.on('rentPaid', ({ payerSocketId, payerMoney, payerLoan, ownerSocketId, ownerMoney, amount, baseRent, multiplier, propertyName }) => {
      console.log('[GameScreen] rentPaid', { payerSocketId, ownerSocketId, amount });
      
      // Update players' money and loan synchronously
      setPlayers(prevPlayers => {
        const updatedPlayers = prevPlayers.map(p => {
          if (p.socketId === payerSocketId) {
            return { ...p, money: payerMoney, loan: payerLoan };
          }
          if (p.socketId === ownerSocketId) {
            return { ...p, money: ownerMoney };
          }
          return p;
        });

        // Update current player if they're involved
        if (player.socketId === payerSocketId) {
          setPlayer(prev => ({ ...prev, money: payerMoney, loan: payerLoan }));
        } else if (player.socketId === ownerSocketId) {
          setPlayer(prev => ({ ...prev, money: ownerMoney }));
        }

        return updatedPlayers;
      });

      // Show rent payment notification with stylized multiplier
      setError(
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px', 
          justifyContent: 'center',
          fontSize: '1.6em',  
          padding: '15px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '8px'
        }}>
          <span>
            {`${players.find(p => p.socketId === payerSocketId)?.name} paid rent to ${players.find(p => p.socketId === ownerSocketId)?.name} for ${propertyName} - $${baseRent.toLocaleString()}`}
          </span>
          {multiplier > 1 && (
            <span style={{ 
              color: '#FFA500', 
              fontSize: '1.5em',  
              fontWeight: 'bold',
              marginLeft: '8px'
            }}>
              {`X${multiplier}`}
            </span>
          )}
        </div>
      );
      setTimeout(() => setError(null), 5000);
    });

    // Add start bonus handler
    socket.on('startBonus', ({ playerSocketId, newMoney, amount, reason }) => {
      console.log('[GameScreen] startBonus', { playerSocketId, newMoney, amount, reason });
      
      // Update players' money synchronously
      setPlayers(prevPlayers => {
        const updatedPlayers = prevPlayers.map(p =>
          p.socketId === playerSocketId ? { ...p, money: newMoney } : p
        );

        // Update current player if they got the bonus
        if (player.socketId === playerSocketId) {
          setPlayer(prev => ({ ...prev, money: newMoney }));
          setError(`You received $${amount} for ${reason} Start!`);
          setTimeout(() => setError(null), 7000);
        }

        return updatedPlayers;
      });
    });

    // Add road cash handler
    socket.on('roadCashResult', ({ playerSocketId, newMoney, amount }) => {
      console.log('[GameScreen] roadCashResult', { playerSocketId, newMoney, amount });
      
      // Update players' money synchronously
      setPlayers(prevPlayers => {
        const updatedPlayers = prevPlayers.map(p =>
          p.socketId === playerSocketId ? { ...p, money: newMoney } : p
        );

        // Update current player if they got the money
        if (player.socketId === playerSocketId) {
          setPlayer(prev => ({ ...prev, money: newMoney }));
          setError(`You won $${amount} on the road!`);
          setTimeout(() => setError(null), 5000);
        }

        return updatedPlayers;
      });
    });

    // Add casino result handler
    socket.on('casinoResult', ({ playerId, dice, amount, won, playerName, playerMoney }) => {
      console.log('[GameScreen] casinoResult', { playerId, dice, amount, won, playerName, playerMoney });
      
      // Update players' money synchronously
      setPlayers(prevPlayers => {
        const updatedPlayers = prevPlayers.map(p =>
          p.socketId === playerId ? { ...p, money: playerMoney } : p
        );

        // Update current player if they're involved
        if (player.socketId === playerId) {
          setPlayer(prev => ({ ...prev, money: playerMoney }));
        } else {
          setError(`${playerName} ${won ? 'won' : 'lost'} $${amount} at the casino!`);
          setTimeout(() => setError(null), 5000);
        }

        return updatedPlayers;
      });
    });

    // Add trade accepted handler
    socket.on('tradeAccepted', ({ fromPlayer, toPlayer }) => {
      console.log('[GameScreen] tradeAccepted', { fromPlayer, toPlayer });
      
      // Update players' money and properties synchronously
      setPlayers(prevPlayers => {
        const updatedPlayers = prevPlayers.map(p => {
          if (p.socketId === fromPlayer.socketId) {
            return { ...p, money: fromPlayer.money, properties: fromPlayer.properties };
          }
          if (p.socketId === toPlayer.socketId) {
            return { ...p, money: toPlayer.money, properties: toPlayer.properties };
          }
          return p;
        });

        // Update current player if they were involved
        if (player.socketId === fromPlayer.socketId) {
          setPlayer(prev => ({ ...prev, money: fromPlayer.money, properties: fromPlayer.properties }));
        } else if (player.socketId === toPlayer.socketId) {
          setPlayer(prev => ({ ...prev, money: toPlayer.money, properties: toPlayer.properties }));
        }

        return updatedPlayers;
      });
    });

    // Add playerMoved event handler
    socket.on('playerMoved', ({ playerId, tileId }) => {
      console.log('[GameScreen] playerMoved', { playerId, tileId });
      if (playerId === player?.socketId) {
        setPlayer(prev => ({ ...prev, tileId }));
      }
      setPlayers(prev => 
        prev.map(p => p.socketId === playerId ? { ...p, tileId } : p)
      );
      // Clear any previous messages when a player moves
      setError(null);
    });

    socket.on('purchaseFailed', ({ reason }) => {
      console.log('[GameScreen] purchaseFailed', reason);
      if (reason === 'insufficientFunds') {
        setError("You don't have enough money.");
      } else if (reason === 'alreadyOwned') {
        setError('You already own this property.');
      } else {
        setError('Cannot buy this property.');
      }
      // Clear error message after 5 seconds
      setTimeout(() => setError(null), 5000);
    });

    // Add rent bonus handler
    socket.on('rentBonus', ({ playerSocketId, newMoney, amount, propertyName }) => {
      console.log('[GameScreen] rentBonus', { playerSocketId, amount });
      
      // Update player's money
      const updated = players.map(p =>
        p.socketId === playerSocketId ? { ...p, money: newMoney } : p
      );
      setPlayers(updated);

      // Update current player if they got the bonus
      if (player.socketId === playerSocketId) {
        setPlayer(prev => ({ ...player, money: newMoney }));
        setError(`You received $${amount} bonus for landing on your property ${propertyName}!`);
        // Clear bonus message after 5 seconds
        setTimeout(() => setError(null), 5000);
      }
    });

    // Add RPS event listeners
    socket.on('stonePaperScissorsStart', (game) => {
      console.log('[RPS] Game started:', game);
      setRpsGame(game);
      setRpsChoice(null);
      setRpsResult(null);
      setRpsTieAmount(null);
    });

    socket.on('stonePaperScissorsResult', (result) => {
      console.log('[RPS] Result received:', result);
      setRpsResult(result);
      
      // Update players' money in the game state
      const updatedPlayers = players.map(p => {
        if (p.socketId === result.landingPlayer.socketId) {
          return { 
            ...p, 
            money: result.landingPlayer.money < 0 ? 0 : result.landingPlayer.money,
            loan: result.landingPlayer.money < 0 ? 
              (result.landingPlayer.loan || 0) + Math.abs(result.landingPlayer.money) : 
              (result.landingPlayer.loan || 0)
          };
        }
        // Update winners' money and loans
        const winner = result.winners.find(w => w.socketId === p.socketId);
        if (winner) {
          return { 
            ...p, 
            money: winner.money < 0 ? 0 : winner.money,
            loan: winner.money < 0 ? 
              (winner.loan || 0) + Math.abs(winner.money) : 
              (winner.loan || 0)
          };
        }
        // Update losers' money and loans
        const loser = result.losers.find(l => l.socketId === p.socketId);
        if (loser) {
          return { 
            ...p, 
            money: loser.money < 0 ? 0 : loser.money,
            loan: loser.money < 0 ? 
              (loser.loan || 0) + Math.abs(loser.money) : 
              (loser.loan || 0)
          };
        }
        return p;
      });
      setPlayers(updatedPlayers);

      // Update current player's money and loan if they were involved
      if (player.socketId === result.landingPlayer.socketId) {
        setPlayer(prev => ({ 
          ...prev, 
          money: result.landingPlayer.money < 0 ? 0 : result.landingPlayer.money,
          loan: result.landingPlayer.money < 0 ? 
            (result.landingPlayer.loan || 0) + Math.abs(result.landingPlayer.money) : 
            (result.landingPlayer.loan || 0)
        }));
      } else {
        const winner = result.winners.find(w => w.socketId === player.socketId);
        if (winner) {
          setPlayer(prev => ({ 
            ...prev, 
            money: winner.money < 0 ? 0 : winner.money,
            loan: winner.money < 0 ? 
              (winner.loan || 0) + Math.abs(winner.money) : 
              (winner.loan || 0)
          }));
        }
        const loser = result.losers.find(l => l.socketId === player.socketId);
        if (loser) {
          setPlayer(prev => ({ 
            ...prev, 
            money: loser.money < 0 ? 0 : loser.money,
            loan: loser.money < 0 ? 
              (loser.loan || 0) + Math.abs(loser.money) : 
              (loser.loan || 0)
          }));
        }
      }

      // Add RPS result to game events with loan information
      result.winners.forEach(winner => {
        result.losers.forEach(loser => {
          const message = `${winner.name} won against ${loser.name} in RPS (${winner.choice} vs ${loser.choice}). ${winner.name} now has $${winner.money.toLocaleString()}${winner.loan ? ` and $${winner.loan.toLocaleString()} loan` : ''} and ${loser.name} has $${loser.money.toLocaleString()}${loser.loan ? ` and $${loser.loan.toLocaleString()} loan` : ''}. ${winner.name} drew $${winner.drawnAmount.toLocaleString()} from ${loser.name}.`;
          setGameEvents(prev => [...prev, { message }]);
        });
      });

      // Clear game state after a delay to show the result
      setTimeout(() => {
        setRpsGame(null);
        setRpsResult(null);
        setRpsChoice(null);
      }, 3000);
    });

    socket.on('stonePaperScissorsTie', ({ landingPlayerId, tiedPlayerId, tiedPlayerName, maxAmount, gameId }) => {
      console.log('[RPS] Tie resolution:', { landingPlayerId, tiedPlayerId, tiedPlayerName, maxAmount, gameId });
      if (player?.socketId === landingPlayerId) {
        setRpsTieAmount({ maxAmount, gameId, tiedPlayerId, tiedPlayerName });
      }
    });

    socket.on('stonePaperScissorsTieResolved', (result) => {
      console.log('[RPS] Tie resolved:', result);

      // Update players' money in the game state
      const updatedPlayers = players.map(p => {
        if (p.socketId === result.landingPlayer.socketId) {
          return { ...p, money: result.landingPlayer.money };
        }
        if (p.socketId === result.tiedPlayer.socketId) {
          return { ...p, money: result.tiedPlayer.money };
        }
        return p;
      });
      setPlayers(updatedPlayers);

      // Update current player's money if they were involved
      if (player?.socketId === result.landingPlayer.socketId) {
        setPlayer(prev => ({ ...prev, money: result.landingPlayer.money }));
      } else if (player?.socketId === result.tiedPlayer.socketId) {
        setPlayer(prev => ({ ...prev, money: result.tiedPlayer.money }));
      }

      // Add tie resolution to game events
      const message = `${result.landingPlayer.name} and ${result.tiedPlayer.name} tied in RPS. ${result.landingPlayer.name} drew $${result.drawnAmount.toLocaleString()} from ${result.tiedPlayer.name}. ${result.landingPlayer.name} now has $${result.landingPlayer.money.toLocaleString()} and ${result.tiedPlayer.name} has $${result.tiedPlayer.money.toLocaleString()}.`;
      setGameEvents(prev => [...prev, { message }]);

      // If there are remaining ties, keep the game state
      if (result.remainingTies > 0) {
        setRpsTieAmount(null);
      } else {
        // Clear all RPS state if no more ties to resolve
        setRpsGame(null);
        setRpsResult(null);
        setRpsChoice(null);
        setRpsTieAmount(null);
      }
    });

    return () => {
      socket.off('purchaseSuccess');
      socket.off('purchaseFailed');
      socket.off('rentPaid');
      socket.off('playerMoved');
      socket.off('rentBonus');
      socket.off('startBonus');
      socket.off('casinoResult');
      socket.off('roadCashResult');
      socket.off('stonePaperScissorsStart');
      socket.off('stonePaperScissorsResult');
      socket.off('stonePaperScissorsTie');
      socket.off('stonePaperScissorsTieResolved');
      socket.off('tradeAccepted');
    };
  }, [socket, player, players, setPlayer, setPlayers]);

  // Update inCasino state when tile changes
  useEffect(() => {
    const isCasinoTile = tileMeta?.id === 16;
    setInCasino(isCasinoTile);
    if (isCasinoTile) {
      setHasCasinoPlayed(false);
    }
  }, [tileMeta]);

  // Reset casino states when turn ends
  useEffect(() => {
    if (!isMyTurn) {
      setInCasino(false);
      setHasCasinoPlayed(false);
    }
  }, [isMyTurn]);

  const handleBuy = () => {
    console.log('[GameScreen] handleBuy invoked');
    setError(null);
    socket.emit('buyProperty');
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundImage: `url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Main game area */}
      <div style={{
        flex: 1,
        display: 'flex',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Board />
        <PlayerStats />
      </div>

      {/* Footer */}
      <div style={{
        height: '250px',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'stretch',
        position: 'relative',
        borderTop: '2px solid rgba(255, 255, 255, 0.1)'
      }}>
        {/* Quit Game Button - Now positioned absolutely */}
        <button
          onClick={handleQuit}
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            padding: '8px 16px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          Quit Game
        </button>

        {/* Game Info Section */}
        <div style={{
          flex: '0 0 400px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#4CAF50'
          }}>
            <span style={{ fontSize: '24px' }}>📋</span>
            <h3 style={{ margin: 0, color: 'white' }}>Game Events</h3>
          </div>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            color: 'white'
          }}>
            <GameEvents />
          </div>
        </div>

        {/* Vertical Separator 1 */}
        <div style={{
          width: '1px',
          margin: '25px 0',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.3) 20%, rgba(255, 255, 255, 0.3) 80%, transparent 100%)',
          alignSelf: 'stretch'
        }} />

        {/* Bank Section */}
        <div style={{
          flex: '0 0 400px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#2196F3'
          }}>
            <span style={{ fontSize: '24px' }}>💰</span>
            <h3 style={{ margin: 0, color: 'white' }}>Bank</h3>
          </div>
          <div style={{
            flex: 1,
            overflowY: 'auto'
          }}>
            <Dashboard />
          </div>
        </div>

        {/* Vertical Separator 2 */}
        <div style={{
          width: '1px',
          margin: '25px 0',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.3) 20%, rgba(255, 255, 255, 0.3) 80%, transparent 100%)',
          alignSelf: 'stretch'
        }} />

        {/* Dice Roller Section */}
        <div style={{
          flex: '0 0 400px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          {isMyTurn && testRollMode && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '4px',
              zIndex: 100
            }}>
              {testRollInput}
            </div>
          )}
          <DiceRoller 
            testRollMode={testRollMode} 
            hasCasinoPlayed={hasCasinoPlayed}
          />
        </div>

        {/* Vertical Separator 3 */}
        <div style={{
          width: '1px',
          margin: '25px 0',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.3) 20%, rgba(255, 255, 255, 0.3) 80%, transparent 100%)',
          alignSelf: 'stretch'
        }} />

        {/* Chat Section */}
        <div style={{
          flex: '0 0 400px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#9C27B0'
          }}>
            <span style={{ fontSize: '24px' }}>💬</span>
            <h3 style={{ margin: 0, color: 'white' }}>Chat</h3>
          </div>
          <div style={{
            flex: 1,
            overflowY: 'auto'
          }}>
            <Chat />
          </div>
        </div>

        {/* Vertical Separator 4 */}
        <div style={{
          width: '1px',
          margin: '25px 0',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.3) 20%, rgba(255, 255, 255, 0.3) 80%, transparent 100%)',
          alignSelf: 'stretch'
        }} />

        {/* Trade Section */}
        <div style={{
          flex: '0 0 400px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#FF9800'
          }}>
            <span style={{ fontSize: '24px' }}>🔄</span>
            <h3 style={{ margin: 0, color: 'white' }}>Trade</h3>
          </div>
          <div style={{
            flex: 1,
            overflowY: 'auto'
          }}>
            <TradePanel />
          </div>
        </div>
      </div>
    </div>
  );
}