import React, { useContext, useState, useEffect } from 'react';
import bgImage from '../assets/bg.png';
import startIcon from '../assets/start.png';
import hotelIcon from '../assets/hotel.png';
import casinoIcon from '../assets/casino.png';
import roadIcon from '../assets/road.png';
import Board from './Board';
import DiceRoller from './DiceRoller';
import PlayerStats from './PlayerStats';
import RoadCash from './RoadCash';
import RPSTieResolver from './RPSTieResolver';
import { GameContext } from '../context/GameContext';
import { tiles } from '../data/tiles';
import Chat from './Chat';
import TradePanel from './TradePanel';

const CasinoBetting = ({ isMyTurn, currentMoney, socket, player, onCasinoPlayed, isRpsActive }) => {
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
      padding: '0px',
      gap: '10px'
    }}>
      {/* Money Input */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100%',
        padding: '1px',
        gap: '10px'
      }}>
      
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          padding: '8px 36px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <button
            onClick={() => handleAmountChange(-500)}
            disabled={!isMyTurn || betAmount <= 1000 || isRpsActive}
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
            padding: '4px 4px',
            minWidth: '100px',
            textAlign: 'center',
            fontSize: '2em',
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.2)'
          }}>
            ${betAmount}
          </div>
          <button
            onClick={() => handleAmountChange(500)}
            disabled={!isMyTurn || betAmount >= currentMoney || isRpsActive}
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
          padding: '2px 8px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {[
            { type: 'below', label: 'Below', odds: '2x' },
            { type: '7', label: '7', odds: '3x' },
            { type: 'above', label: 'Above', odds: '2x' }
          ].map(bet => (
            <button
              key={bet.type}
              onClick={() => handleBetSelect(bet.type)}
              disabled={!isMyTurn}
              style={{
                padding: '4px',
                backgroundColor: selectedBet === bet.type ? '#2196F3' : 'rgba(33, 150, 243, 0.3)',
                color: '#fff',
                border: selectedBet === bet.type ? '2px solid #90CAF9' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                cursor: isMyTurn ? 'pointer' : 'not-allowed',
                fontSize: '1.2em',
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
          disabled={!isMyTurn || !selectedBet || betAmount < 1000 || betAmount > currentMoney || isRpsActive}
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
    handleQuit,
    isRpsActive
  } = useContext(GameContext);

  const isMyTurn = player?.socketId === currentPlayerId;
  const hasRolled = players.find(p => p.socketId === player?.socketId)?.hasRolled ?? player?.hasRolled ?? false;
  const [error, setError] = useState(null);
  const [testRollInput, setTestRollInput] = useState('');
  const [testRollMode, setTestRollMode] = useState(false);
  const [inCasino, setInCasino] = useState(false);
  const [hasCasinoPlayed, setHasCasinoPlayed] = useState(false);
  const [hasChosenCorner, setHasChosenCorner] = useState(false);
  const [rpsGame, setRpsGame] = useState(null);
  const [rpsChoice, setRpsChoice] = useState(null);
  const [rpsResult, setRpsResult] = useState(null);
  

  // Automatically clear RPS result message after 5 seconds
  useEffect(() => {
    if (rpsResult) {
      const timeout = setTimeout(() => setRpsResult(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [rpsResult]);
  const [rpsTieAmount, setRpsTieAmount] = useState(null);
  const [activeSidePanel, setActiveSidePanel] = useState(null);
  // Add new state for toggling side panel visibility
  const [sidePanelVisible, setSidePanelVisible] = useState(true);
  const [borrowAmount, setBorrowAmount] = useState(500);
  const [payoffAmount, setPayoffAmount] = useState(500);
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
    return () => socket.off('borrowResponse', handleBorrowResponse);
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
    if (!isMyTurn && tileMeta) {
      setHasChosenCorner(false);
    }
  }, [isMyTurn, tileMeta, setHasChosenCorner]);

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
    }, [isMyTurn, movementDone, tileMeta, player, testRollMode, testRollInput, hasRolled]);

  // Listen for purchase events
  useEffect(() => {
    socket.on('purchaseSuccess', ({ socketId, money, properties }) => {
      
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
    setError(null);
    socket.emit('buyProperty');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      transition: 'all 0.3s ease',
      backgroundImage: `url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'top center',
      backgroundRepeat: 'no-repeat',
      position: 'relative',
      marginTop: 0,
      paddingTop: 0
    }}>
      {/* Side Panel Buttons and Panels - Fixed to right side */}
      {sidePanelVisible && (
        <div style={{
          position: 'fixed',
          right: '0px', 
          height: '100%',
          width: activeSidePanel ? '680px' : '210px',
          zIndex: 1000,
          transition: 'width 0.3s ease',
          display: 'flex'
        }}>
          {/* Panel Buttons Column */}
          <div style={{
            width: '210px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '0px',
            padding: '80px 0 30px 0',
            backgroundColor: 'rgba(0, 0, 0, 1)',
            borderLeft: '4px solid rgb(52, 52, 52)',
            position: 'relative'
          }}>
            {Object.entries(panelConfigs).map(([panelId, config], index) => (
              <React.Fragment key={panelId}>
                <div 
                  onClick={() => setActiveSidePanel(activeSidePanel === panelId ? null : panelId)}
                  style={{
                    width: '100%',
                    height: '150px',
                    backgroundColor: activeSidePanel === panelId ? config.color + '44' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    borderLeft: activeSidePanel === panelId ? `4px solid ${config.color}` : 'none',
                    position: 'relative',
                    zIndex: 1
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.4em',
                    width: '100%',
                    padding: '0 15px',
                    textAlign: 'center'
                  }}>
                    {config.title}
                  </div>
                </div>
                {/* Add separator line after each button except the last one */}
                {index < Object.entries(panelConfigs).length - 1 && (
                  <div style={{
                    height: '2px',
                    margin: '0 20px',
                    background: 'linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.3) 10%, rgba(255, 255, 255, 0.3) 90%, transparent 100%)',
                    pointerEvents: 'none',
                    position: 'relative',
                    zIndex: 3000,
                    transform: 'translateY(-1px)'
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Active Panel Content */}
          {activeSidePanel && Object.entries(panelConfigs)
            .filter(([panelId]) => panelId === activeSidePanel)
            .map(([panelId, config]) => (
              <div
                key={panelId}
                style={{
                  position: 'absolute',
                  left: '210px',
                  top: 0,
                  width: '470px',
                  height: '100%',
                  backgroundColor: `${config.color}`,
                  transform: 'translateX(0)',
                  transition: 'transform 0.3s ease',
                  padding: '60px 40px 20px 20px',
                  color: 'white',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <h1 style={{ marginBottom: '20px' }}>{config.title}</h1>
                {/* Panel specific content */}
                {panelId === 'info' && (
                  <div style={{
                    height: 'calc(100vh - 250px)',
                    overflowY: 'auto',
                    padding: '15px',
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '8px',
                    gap: '15px'
                  }}>
                    {gameEvents.map((event, index) => {
                      // Process the message to color-code money amounts
                      const message = event.message.replace(
                        /\$(\d+,?\d*)/g,
                        (match, amount) => {
                          // Determine if this is a gain or loss
                          const isGain = event.message.includes('received') ||
                                         event.message.includes('won') ||
                                         event.message.includes('bonus') ||
                                         event.message.includes('collected $') ||
                                         event.message.includes('on the road');
                          const isLoss = event.message.includes('paid') ||
                                         event.message.includes('lost');
                          return `<span style="color: ${isGain ? '#4CAF50' : isLoss ? '#f44336' : 'white'}">${match}</span>`;
                        }
                      );

                      return (
                        <div
                          key={index}
                          style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            padding: '12px 15px',
                            borderRadius: '8px',
                            fontSize: '2em',
                            lineHeight: '1.4'
                          }}
                          dangerouslySetInnerHTML={{ __html: message }}
                        />
                      );
                    })}
                  </div>
                )}
                {panelId === 'bank' && (
                  <div>
                    {/* Borrow Section */}
                    <div style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.33)',
                      padding: '20px',
                      borderRadius: '8px',
                      marginTop: '70px',
                      border: '3px outset rgb(80, 80, 170)',
                    }}>
                      <h4 style={{ marginBottom: '15px' , fontSize: '1em', }}>Borrow Money</h4>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '1em',
                        marginBottom: '20px',
                        justifyContent: 'center'
                      }}>
                        <button
                          onClick={() => setBorrowAmount(Math.max(500, borrowAmount - 500))}
                          disabled={isRpsActive}
                          style={{
                            padding: '8px 12px',
                            fontSize: '1.7em',
                            cursor: 'pointer',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            borderRadius: '4px',
                            border: '2px inset rgb(80, 80, 170)',
                          }}
                        >
                          -
                        </button>
                        <div style={{
                          padding: '8px 16px',
                          backgroundColor: 'rgba(255, 255, 255, 0.15)',
                          borderRadius: '4px',
                          minWidth: '100px',
                          textAlign: 'center',
                          fontSize: '1.7em',
                          border: '2px inset rgb(80, 80, 170)',
                        }}>
                          ${borrowAmount}
                        </div>
                        <button
                          onClick={() => setBorrowAmount(Math.min(100000, borrowAmount + 500))}
                          disabled={isRpsActive}
                          style={{
                            padding: '8px 12px',
                            fontSize: '1.7em',
                            cursor: 'pointer',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            borderRadius: '4px',
                            border: '2px inset rgb(80, 80, 170)',
                          }}
                        >
                          +
                        </button>
                      </div>
                      {/* Borrow Button with border effect */}
                      <button
                        onClick={async (e) => {
                          // Add border effect on click
                          e.target.style.border = '2px inset rgb(80, 80, 170)';
                          if (socket) {
                            socket.emit('borrowMoney', { amount: borrowAmount });
                            setBorrowAmount(500); // Reset to default
                          }
                          setTimeout(() => {
                            e.target.style.border = '2px outset rgb(80, 80, 170)';
                          }, 180);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.3)',
                          border: '1px outset rgb(80, 80, 170)',
                          color: 'white',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '1.1em',
                          transition: 'background-color 0.2s, border 0.1s',
                        }}
                      >
                        Borrow
                      </button>

                      {/* Borrow exact amount for property if needed */}
                      {isMyTurn && tileMeta?.type === 'property' &&
                        !players.some(p => (p.properties || []).includes(tileMeta?.id)) &&
                        tileMeta.cost > (player?.money || 0) && (
                         <button
                           onClick={async (e) => {
                           if (isRpsActive) return;
                             e.target.style.border = '2px inset rgb(80, 80, 170)';
                             if (socket) {
                               const amountNeeded = tileMeta.cost - (player?.money || 0);
                               socket.emit('borrowMoney', { amount: amountNeeded });
                               setBorrowAmount(500);
                             }
                             setTimeout(() => {
                               e.target.style.border = '2px outset rgb(80, 80, 170)';
                             }, 180);
                           }}
                           style={{
                             width: '100%',
                             marginTop: '10px',
                             padding: '12px',
                             backgroundColor: 'rgba(255, 255, 255, 0.3)',
                             border: '1px outset rgb(80, 80, 170)',
                             color: 'rgb(255, 255, 255)',
                             borderRadius: '4px',
                             cursor: 'pointer',
                             fontSize: '1.1em',
                             transition: 'background-color 0.2s, border 0.1s',
                           }}
                         >
                           Borrow ${tileMeta.cost - (player?.money || 0)}
                         </button>
                       )}
                    </div>

                    {/* Pay Off Section */}
                    <div style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.33)',
                      padding: '20px',
                      borderRadius: '8px',
                      marginTop: '20px',
                      border: '3px outset rgb(80, 80, 170)',
                    }}>
                      <h4 style={{ marginBottom: '15px' }}>Pay Off Loan</h4>
                      <div style={{
                        display: 'flex',
                        gap: '10px',
                        marginBottom: '20px',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1em'
                      }}>
                        <button
                          onClick={() => setPayoffAmount(Math.max(500, payoffAmount - 500))}
                          disabled={!player?.loan || isRpsActive}
                          style={{
                            padding: '8px 12px',
                            cursor: player?.loan ? 'pointer' : 'not-allowed',
                            backgroundColor: player?.loan ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '1.7em',
                            border: '2px inset rgb(80, 80, 170)',
                          }}
                        >
                          -
                        </button>
                        <div style={{
                          padding: '8px 16px',
                          backgroundColor: 'rgba(255, 255, 255, 0.15)',
                          borderRadius: '4px',
                          minWidth: '100px',
                          textAlign: 'center',
                          fontSize: '1.7em',
                          border: '2px inset rgb(80, 80, 170)',
                        }}>
                          ${Math.min(payoffAmount, player?.loan || 0)}
                        </div>
                        <button
                          onClick={() => setPayoffAmount(Math.min(player?.loan || 0, payoffAmount + 500))}
                          disabled={!player?.loan || isRpsActive}
                          style={{
                            padding: '8px 12px',
                            fontSize: '1.7em',
                            cursor: player?.loan ? 'pointer' : 'not-allowed',
                            backgroundColor: player?.loan ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            borderRadius: '4px',
                            border: '2px inset rgb(80, 80, 170)',
                          }}
                        >
                          +
                        </button>
                      </div>
                      {/* Pay Off Button with border effect */}
                      <button
                        onClick={async (e) => {
                          // Add border effect on click
                          e.target.style.border = '2px inset rgb(80, 80, 170)';
                          if (socket && player?.loan && player?.money >= payoffAmount) {
                            socket.emit('payoffLoan', { amount: Math.min(payoffAmount, player.loan) });
                            setPayoffAmount(1000); // Reset to default
                          }
                          setTimeout(() => {
                            e.target.style.border = '2px outset rgb(80, 80, 170)';
                          }, 180);
                        }}
                        disabled={!player?.loan || player?.money < payoffAmount || isRpsActive}
                        style={{
                          width: '100%',
                          padding: '12px',
                          backgroundColor: player?.loan && player?.money >= payoffAmount 
                            ? 'rgba(255, 255, 255, 0.3)' 
                            : 'rgba(255, 255, 255, 0.1)',
                          border: '2px outset rgb(80, 80, 170)',
                          color: 'white',
                          borderRadius: '4px',
                          cursor: player?.loan && player?.money >= payoffAmount ? 'pointer' : 'not-allowed',
                          fontSize: '1.1em',
                          transition: 'background-color 0.2s, border 0.1s',
                        }}
                      >
                        Pay Off
                      </button>
                      {player?.money < payoffAmount && (
                        <div style={{
                          color: '#ff6b6b',
                          marginTop: '10px',
                          textAlign: 'center',
                          fontSize: '0.9em'
                        }}>
                          Insufficient funds
                        </div>
                      )}
                      {/* Pay All Button */}
                      <button
                        onClick={async (e) => {
                          e.target.style.border = '2px inset rgb(80, 80, 170)';
                          if (socket && player?.loan && player?.money) {
                            const payAmount = player.money >= player.loan ? player.loan : player.money;
                            socket.emit('payoffLoan', { amount: payAmount });
                            setPayoffAmount(1000); // Reset to default
                          }
                          setTimeout(() => {
                            e.target.style.border = '2px outset rgb(80, 80, 170)';
                          }, 180);
                        }}
                        disabled={!player?.loan || !player?.money || isRpsActive}
                        style={{
                          width: '100%',
                          marginTop: '10px',
                          padding: '12px',
                          backgroundColor: (!player?.loan || !player?.money) ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)',
                          border: '2px outset rgb(80, 80, 170)',
                          color: (!player?.loan || !player?.money) ? '#aaa' : '#fff',
                          borderRadius: '4px',
                          cursor: (!player?.loan || !player?.money) ? 'not-allowed' : 'pointer',
                          fontSize: '1.1em',
                          fontWeight: 'bold',
                          transition: 'background-color 0.2s, border 0.1s',
                        }}
                      >
                        Pay All
                      </button>
                    </div>

                    {/* Status Section */}
                    <div style={{
                      marginTop: '20px',
                      padding: '20px',
                      backgroundColor: 'rgba(0, 0, 0, 0.33)',
                      borderRadius: '8px',
                      border: '3px outset rgb(80, 80, 170)',
                    }}>
                      <h4>Current Status</h4>
                      <div style={{ 
                        marginTop: '10px',
                        fontSize: '1.2em'
                      }}>
                        <div style={{ marginBottom: '5px' }}>Money: ${player?.money || 0}</div>
                        <div> Loan: ${player?.loan || 0}</div>
                      </div>
                    </div>
                    {error && (
                      <div style={{
                        color: '#ff6b6b',
                        marginTop: '10px',
                        textAlign: 'center'
                      }}>
                        {error}
                      </div>
                    )}
                  </div>
                )}
                {panelId === 'chat' && (
                  <div style={{
                    height: '100%',
                    padding: '20px'
                  }}>
                    <Chat />
                  </div>
                )}
                {panelId === 'trade' && (
                  <TradePanel />
                )}
              </div>
            ))}
        </div>
      )}

      {/* Toggle Side Panel Button */}
      <button
        onClick={() => setSidePanelVisible(v => !v)}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: sidePanelVisible ? (activeSidePanel ? '690px' : '220px') : '20px',
          zIndex: 2001,
          background: '#000',
          color: '#fff',
          border: '3px solid rgb(52, 52, 52)',
          width: '56px',
          height: '200px',
          fontSize: '2em',
          boxShadow: '0 2px 8px rgba(30, 30, 30, 0.42)',
          cursor: 'pointer',
          transition: 'right 0.3s, background 0.2s',
          borderTopRightRadius: '0px',
          borderBottomRightRadius: '0px',
          borderTopLeftRadius: '40px',
          borderBottomLeftRadius: '40px', 
        }}
        aria-label={sidePanelVisible ? "Hide Side Panel" : "Show Side Panel"}
        title={sidePanelVisible ? "Hide Side Panel" : "Show Side Panel"}
      >
        {sidePanelVisible ? '>' : '<'}
      </button>

      {/* Board and Player Stats */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        position: 'relative',
        top: '120px',
        left: '320px',
        marginBottom: '700px',
        marginRight: '640px',
        padding: '60px 20px 0px 20px', 
        minHeight: 'calc(100vh - 300px)' 
      }}>
        <div style={{ 
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          minHeight: '600px'
        }}>
          <div style={{ 
            position: 'relative',
            margin: '300px'
          }}>
            <Board />
            <PlayerStats />
            {/* Road Cash Ui */}
            
            {isMyTurn && tileMeta?.id === 22 && hasRolled &&(
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: '1fr 1fr',
                gap: '20px',
                padding: '20px',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                borderRadius: '12px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                zIndex: 999
              }}>
                <RoadCash isMyTurn={isMyTurn} socket={socket} />
              </div>
            )}
            {/* RPSTieResolver overlay above board */}
            {rpsTieAmount && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 999
              }}>
                <RPSTieResolver
                  maxAmount={rpsTieAmount.maxAmount}
                  gameId={rpsTieAmount.gameId}
                  tiedPlayerId={rpsTieAmount.tiedPlayerId}
                  tiedPlayerName={rpsTieAmount.tiedPlayerName}
                  socket={socket}
                  onResolved={() => {
                    setRpsTieAmount(null);
                    setRpsGame(null);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Footer */}
      <div
        className="footer-bar"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          minHeight: '200px',
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          borderTop: '2px solid #666',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 10px 10px 10px',
          zIndex: 99,
          height: 'auto',
          maxHeight: '40vh',
        }}
      >
        {/* Quit Game Button - Desktop only */}
        <div
          className="quit-game-button"
          style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'block',
          }}
        >
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to quit the game? This action cannot be undone.')) {
                socket.emit('quitGame');
                handleQuit();
              }
            }}
            disabled={isMyTurn || isRpsActive}
            style={{
              padding: '10px 20px',
              fontSize: '1.2em',
              backgroundColor: isMyTurn ? '#666666' : '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isMyTurn ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s',
              opacity: isMyTurn ? 0.7 : 1,
              width: '100%',
              maxWidth: '180px',
            }}
            onMouseOver={e => !isMyTurn && (e.target.style.backgroundColor = '#ff6666')}
            onMouseOut={e => !isMyTurn && (e.target.style.backgroundColor = '#ff4444')}
          >
            Quit Game
          </button>
        </div>

        {/* Center Sections Container */}
        <div
          className="footer-sections"
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between', // changed from center to space-between
            alignItems: 'stretch',
            gap: '0',
            margin: '0 auto',
            width: '100%',
            maxWidth: '1200px',
            flexWrap: 'nowrap',
            height: '240px',
          }}
        >
          {/* Dice Roller Section */}
          <div
            className="footer-section"
            style={{
              flex: '1 1 0',
              minWidth: 0,
              position: 'relative',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              height: '100%',
              minHeight: '120px',
              width: '100%',
              maxWidth: '100%',
            }}
          >
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              {isMyTurn && (
                <>
                  {testRollMode && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        color: '#fff',
                        padding: '8px 16px',
                        zIndex: 100,
                        fontSize: '1em',
                      }}
                    >
                      {testRollInput}
                    </div>
                  )}
                </>
              )}
              <DiceRoller
                testRollMode={testRollMode}
                hasCasinoPlayed={hasCasinoPlayed}
                style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', maxWidth: '100%' }}
              />
            </div>
          </div>

          {/* Vertical Gradient Separator */}
          <div className="footer-separator" style={{
            width: '2px',
            background: 'linear-gradient(to bottom, transparent 0%, rgba(52,52,52,0.8) 20%, rgba(90,90,90,0.9) 50%, rgba(52,52,52,0.8) 80%, transparent 100%)'  ,
            alignSelf: 'stretch',
            margin: '0 0',
            opacity: 1,
            display: 'block',
          }} />

          {/* Dashboard Section */}
          <div
            className="footer-section"
            style={{
              flex: '1 1 0',
              minWidth: 0,
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              height: '100%',
              width: '100%',
              maxWidth: '100%',
            }}
          >
            <div
              style={{
                fontSize: '2em',
                color: 'white',
                textAlign: 'center',
                wordBreak: 'break-word',
              }}
            >
              {player?.name}
            </div>
            <div
              style={{
                fontSize: '1.8em',
                color: '#4CAF50',
                textAlign: 'center',
                wordBreak: 'break-word',
              }}
            >
              ${player?.money?.toLocaleString()}
            </div>
            {player?.loan > 0 && (
              <div
                style={{
                  fontSize: '1.8em',
                  color: '#ff4444',
                  textAlign: 'center',
                  wordBreak: 'break-word',
                }}
              >
                Loan: ${player?.loan?.toLocaleString()}
              </div>
            )}
            <div
              style={{
                fontSize: '1em',
                color: 'white',
                textAlign: 'center',
                marginTop: '4px',
                wordBreak: 'break-word',
              }}
            >
              {tiles.find(t => t.id === player?.tileId)?.name || 'Unknown Location'}
              
            </div>
          </div>

          {/* Vertical Gradient Separator */}
          <div className="footer-separator" style={{
            width: '2px',
            background: 'linear-gradient(to bottom, transparent 0%, rgba(52,52,52,0.8) 20%, rgba(90,90,90,0.9) 50%, rgba(52,52,52,0.8) 80%, transparent 100%)',
            alignSelf: 'stretch',
            margin: '0 0',
            opacity: 1,
            display: 'block',
            zIndex: 1000,
          }} />

          {/* Events Section */}
          <div
            className="footer-section"
            style={{
              flex: '1 1 0',
              minWidth: 0,
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              width: '100%',
              maxWidth: '100%',
            }}
          >
            {(() => {
              // Show RPS game if active
              if (rpsGame) {
                return (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '15px'
                  }}>
                    {rpsResult ? (
                      // Show result for multiple players
                      <div style={{
                        textAlign: 'center',
                        color: '#fff',
                        fontSize: '1.4em'
                      }}>
                        <div>
                          {rpsResult.landingPlayer.name}'s choice: {rpsResult.landingPlayer.choice}
                        </div>
                        {rpsResult.winners.map(winner => (
                          <div key={winner.socketId} style={{ color: '#f44336' }}>
                            Lost against {winner.name} ({winner.choice})
                          </div>
                        ))}
                        {rpsResult.losers.map(loser => (
                          <div key={loser.socketId} style={{ color: '#4CAF50' }}>
                            Won against {loser.name} ({loser.choice})
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Show RPS buttons for all involved players
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '15px'
                      }}>
                        {((player?.socketId === rpsGame.landingPlayer.socketId) ||
                          rpsGame.closestPlayers.some(p => p.socketId === player?.socketId)) && !rpsChoice && (
                          <>
                            <div style={{ color: '#fff', fontSize: '1.2em', textAlign: 'center' }}>
                              {player?.socketId === rpsGame.landingPlayer.socketId ? (
                                <>
                                  Playing against {rpsGame.closestPlayers.map(p => p.name).join(', ')}
                                  <br />Choose your move:
                                </>
                              ) : (
                                <>
                                  Playing against {rpsGame.landingPlayer.name}
                                  <br />Choose your move:
                                </>
                              )}
                            </div>
                            <div style={{
                              display: 'flex',
                              gap: '10px'
                            }}>
                              {['rock', 'paper', 'scissors'].map(choice => (
                                <button
                                  key={choice}
                                  onClick={() => {
                                    setRpsChoice(choice);
                                    socket.emit('stonePaperScissorsChoice', {
                                      choice,
                                      gameId: rpsGame.gameId
                                    });
                                  }}
                                  style={{
                                    padding: '12px 24px',
                                    fontSize: '1.1em',
                                    backgroundColor: '#2196F3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    textTransform: 'capitalize'
                                  }}
                                >
                                  {choice}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                        {rpsChoice && (
                          <div style={{ color: '#fff', fontSize: '1.2em' }}>
                            You chose: {rpsChoice}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              // Show "Your Turn" for current player before landing
              if (isMyTurn && !movementDone) {
                return (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#fff',
                    fontSize: '1.6em',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                  }}>
                    Your Turn
                  </div>
                );
              }

              // Buy Property
              if (isMyTurn && tileMeta?.type === 'property' && 
                  !players.some(p => p.properties.includes(tileMeta?.id))) {
                return (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <button
                      onClick={handleBuy}
                      disabled={player.money < tileMeta.cost || (player.loan || 0) > 10000}
                      style={{
                        padding: '17px 40px',
                        borderRadius: '10px',
                        border: 0,
                        backgroundColor: player.money >= tileMeta.cost && (player.loan || 0) <= 10000 ? 'rgb(76, 175, 80)' : '#ccc',
                        letterSpacing: '1.5px',
                        fontSize: '1.6em',
                        transition: 'all 0.3s ease',
                        boxShadow: player.money >= tileMeta.cost && (player.loan || 0) <= 10000 ? 'rgb(46, 115, 0) 0px 10px 0px 0px' : 'rgb(48, 47, 47) 0px 10px 0px 0px',
                        color: player.money >= tileMeta.cost && (player.loan || 0) <= 10000 ? 'hsl(0, 0%, 100%)' : '#ff0000',
                        cursor: player.money >= tileMeta.cost && (player.loan || 0) <= 10000 ? 'pointer' : 'not-allowed',
                        fontWeight: 'bold',
                        outline: 'none'
                      }}
                      onMouseOver={e => {
                        if (player.money >= tileMeta.cost && (player.loan || 0) <= 10000) {
                          e.currentTarget.style.boxShadow = 'rgb(46, 115, 0) 0px 7px 0px 0px';
                        }
                      }}
                      onMouseOut={e => {
                        if (player.money >= tileMeta.cost && (player.loan || 0) <= 10000) {
                          e.currentTarget.style.boxShadow = 'rgb(46, 115, 0) 0px 10px 0px 0px';
                        }
                      }}
                      onMouseDown={e => {
                        if (player.money >= tileMeta.cost && (player.loan || 0) <= 10000) {
                          e.currentTarget.style.backgroundColor = 'rgb(76, 175, 80)';
                          e.currentTarget.style.boxShadow = 'rgb(46, 115, 0) 0px 0px 0px 0px';
                          e.currentTarget.style.transform = 'translateY(5px)';
                          e.currentTarget.style.transition = '200ms';
                        }
                      }}
                      onMouseUp={e => {
                        if (player.money >= tileMeta.cost && (player.loan || 0) <= 10000) {
                          e.currentTarget.style.backgroundColor = 'rgb(76, 175, 80)';
                          e.currentTarget.style.boxShadow = 'rgb(46, 115, 0) 0px 10px 0px 0px';
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.transition = 'all 0.3s ease';
                        }
                      }}
                    >
                      Buy (${tileMeta.cost})
                    </button>
                    {error && (
                      <p style={{ color: 'tomato', margin: 0 }}>{error}</p>
                    )}
                    {(player.loan || 0) > 10000 && (
                      <p style={{ color: 'tomato', margin: 0 }}>Cannot buy property when loan exceeds $10,000</p>
                    )}
                  </div>
                );
              }

              // Casino
              if (inCasino && isMyTurn) {
                return (
                  <CasinoBetting 
                    isMyTurn={isMyTurn} 
                    currentMoney={player?.money || 0}
                    socket={socket}
                    player={player}
                    onCasinoPlayed={() => setHasCasinoPlayed(true)}
                    isRpsActive={isRpsActive}
                  />
                );
              }

              // Corner Choice
              if (isMyTurn && tileMeta?.name?.toLowerCase().includes('choose corner')) {
                return (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gridTemplateRows: '1fr 1fr',
                    gap: '10px',
                    width: '100%',
                    height: '100%',
                    maxWidth: '300px',
                    maxHeight: '250px',
                    padding: '10px'
                  }}>
                    <button
                      onClick={() => {
                        socket.emit('teleport', { toTile: 1, prevTile: 30 });
                        setError(null);
                        setHasChosenCorner(true);
                      }}
                      style={{
                        margin: 0,
                        padding: 0,
                        border: '2px solid #666',
                        borderRadius: '8px',
                        backgroundImage: `url(${startIcon})`,
                        backgroundSize: '60%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center 30%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        transition: 'transform 0.2s, background-color 0.2s'
                      }}
                    >
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: '0 0 6px 6px',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '1em',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                        position: 'absolute',
                        bottom: 0,
                        width: '100%',
                        textAlign: 'center'
                      }}>Start</span>
                    </button>
                    <button
                      onClick={() => {
                        socket.emit('teleport', { toTile: 22, prevTile: 21 });
                        setError(null);
                        setHasChosenCorner(true);
                      }}
                      style={{
                        margin: 0,
                        padding: 0,
                        border: '2px solid #666',
                        borderRadius: '8px',
                        backgroundImage: `url(${roadIcon})`,
                        backgroundSize: '60%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center 30%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        transition: 'transform 0.2s, background-color 0.2s'
                      }}
                    >
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: '0 0 6px 6px',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '1em',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                        position: 'absolute',
                        bottom: 0,
                        width: '100%',
                        textAlign: 'center'
                      }}>Road</span>
                    </button>
                    <button
                      onClick={() => {
                        socket.emit('teleport', { toTile: 7, prevTile: 6 });
                        setError(null);
                        setHasChosenCorner(true);
                      }}
                      style={{
                        margin: 0,
                        padding: 0,
                        border: '2px solid #666',
                        borderRadius: '8px',
                        backgroundImage: `url(${hotelIcon})`,
                        backgroundSize: '60%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center 30%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        transition: 'transform 0.2s, background-color 0.2s'
                      }}
                    >
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: '0 0 6px 6px',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '1em',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                        position: 'absolute',
                        bottom: 0,
                        width: '100%',
                        textAlign: 'center'
                      }}>Hotel</span>
                    </button>
                    <button
                      onClick={() => {
                        socket.emit('teleport', { toTile: 16, prevTile: 15 });
                        setError(null);
                        setHasChosenCorner(true);
                      }}
                      style={{
                        margin: 0,
                        padding: 0,
                        border: '2px solid #666',
                        borderRadius: '8px',
                        backgroundImage: `url(${casinoIcon})`,
                        backgroundSize: '60%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center 30%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        transition: 'transform 0.2s, background-color 0.2s'
                      }}
                    >
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: '0 0 6px 6px',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '1em',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                        position: 'absolute',
                        bottom: 0,
                        width: '100%',
                        textAlign: 'center'
                      }}>Casino</span>
                    </button>
                  </div>
                );
              }

              // Show error message if any
              if (error) {
                // Show green for bonus, Start!, or road cash win messages, else tomato
                const isGreen = typeof error === 'string' &&
                  (
                    error.includes('bonus') ||
                    error.includes('Start!') ||
                    error.includes('on the road')
                  );
                return (
                  <p style={{ color: isGreen ? '#4CAF50' : 'tomato', margin: 0, fontSize: '1.4em'  }}>{error}</p>
                );
              }

              // Show empty state for non-turn players or when no action is needed
              return (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: '20px'
                }}>
                  {rpsGame && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '15px'
                    }}>
                      {rpsResult ? (
                        // Show result for multiple players
                        <div style={{
                          textAlign: 'center',
                          color: '#fff',
                          fontSize: '1.4em'
                        }}>
                          <div>
                            {rpsResult.landingPlayer.name}'s choice: {rpsResult.landingPlayer.choice}
                          </div>
                          {rpsResult.winners.map(winner => (
                            <div key={winner.socketId} style={{ color: '#f44336' }}>
                              Lost against {winner.name} ({winner.choice})
                            </div>
                          ))}
                          {rpsResult.losers.map(loser => (
                            <div key={loser.socketId} style={{ color: '#4CAF50' }}>
                              Won against {loser.name} ({loser.choice})
                            </div>
                          ))}
                        </div>
                      ) : null /* Remove RPSTieResolver from here */}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
        {/* Responsive styles for mobile */}
        <style>{`
          @media (max-width: 900px) {
            .footer-bar {
              min-height: 200px !important;
              max-height: 60vh !important;
              height: auto !important;
              padding: 0 0 0 0 !important;
              left: 0 !important;
              right: 180 !important;
            }
            .footer-sections {
              flex-direction: row !important;
              gap: 0 !important;
              align-items: stretch !important;
              flex-wrap: nowrap !important;
              height: 190px !important;
              justify-content: space-between !important;
              margin-right: !important;
            }
            .footer-section {
              flex: 1 1 0 !important;
              min-width: 210 !important;
              width: 1% !important;
              max-width: 100vw !important;
              height: 100% !important;
              padding: 4px !important;
              font-size: 0.95em !important;
              box-sizing: border-box !important;
              text-overflow: ellipsis !important;
            }
            .quit-game-button {
              left: '10px' !important;

            }
            .quit-game-mobile {
              display: block !important;
              width: 100% !important;
              padding: 10px 0 200px 0 !important;
                           text-align: center !important;
            }
          }
          @media (min-width: 901px) {
                       .quit-game-mobile {
              display: none !important;
            }
          }
        `}</style>
      </div>
      
    </div>
    
  );
}