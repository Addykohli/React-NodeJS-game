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

  // If not active (after result), show nothing
  if (!isActive) {
    if (showResult && diceResult) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '20px'
        }}>
          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center'
          }}>
            <img 
              src={`/dice/dice${diceResult[0]}.png`} 
              alt={`Die ${diceResult[0]}`} 
              width={125}
              height={125}
            />
            <img 
              src={`/dice/dice${diceResult[1]}.png`} 
              alt={`Die ${diceResult[1]}`} 
              width={125}
              height={125}
            />
          </div>
          <div style={{
            color: showResult.won ? '#4CAF50' : '#f44336',
            fontWeight: 'bold',
            fontSize: '1.2em'
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
      justifyContent: 'center',
      height: '100%',
      gap: '25px'
    }}>
      {/* Bet amount control */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        padding: '15px 20px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <button
          onClick={() => handleAmountChange(-500)}
          disabled={!isMyTurn || betAmount <= 1000}
          style={{
            padding: '12px 20px',
            fontSize: '1.8em',
            cursor: isMyTurn ? 'pointer' : 'not-allowed',
            backgroundColor: isMyTurn && betAmount > 1000 ? '#ff4444' : 'rgba(255, 68, 68, 0.5)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            width: '60px',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
          }}
        >
          -
        </button>
        <div style={{
          padding: '12px 20px',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          minWidth: '150px',
          textAlign: 'center',
          fontSize: '1.6em',
          color: 'white',
          backgroundColor: 'rgba(0, 0, 0, 0.2)'
        }}>
          ${betAmount}
        </div>
        <button
          onClick={() => handleAmountChange(500)}
          disabled={!isMyTurn || betAmount >= currentMoney}
          style={{
            padding: '12px 20px',
            fontSize: '1.8em',
            cursor: isMyTurn ? 'pointer' : 'not-allowed',
            backgroundColor: isMyTurn && betAmount < currentMoney ? '#4CAF50' : 'rgba(76, 175, 80, 0.5)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            width: '60px',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
          }}
        >
          +
        </button>
      </div>

      {/* Bet type buttons */}
      <div style={{
        display: 'flex',
        gap: '15px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        padding: '15px 20px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {['above', '7', 'below'].map(bet => (
          <button
            key={bet}
            onClick={() => handleBetSelect(bet)}
            disabled={!isMyTurn}
            style={{
              padding: '15px 25px',
              backgroundColor: selectedBet === bet ? '#2196F3' : 'rgba(33, 150, 243, 0.3)',
              color: '#fff',
              border: selectedBet === bet ? '2px solid #90CAF9' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              cursor: isMyTurn ? 'pointer' : 'not-allowed',
              fontSize: '1.4em',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              minWidth: '120px',
              transition: 'all 0.2s ease',
              boxShadow: selectedBet === bet ? '0 0 10px rgba(33, 150, 243, 0.5)' : 'none'
            }}
          >
            {bet}
          </button>
        ))}
      </div>

      {/* Roll button */}
      <button
        onClick={handleRoll}
        disabled={!isMyTurn || !selectedBet || betAmount < 1000 || betAmount > currentMoney}
        style={{
          padding: '15px 40px',
          backgroundColor: isMyTurn && selectedBet && betAmount >= 1000 && betAmount <= currentMoney 
            ? '#FFA000' 
            : 'rgba(255, 160, 0, 0.3)',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          marginTop: '10px',
          cursor: isMyTurn && selectedBet ? 'pointer' : 'not-allowed',
          fontSize: '1.8em',
          fontWeight: 'bold',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          transition: 'all 0.3s ease',
          boxShadow: isMyTurn && selectedBet ? '0 4px 15px rgba(255, 160, 0, 0.4)' : 'none',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
        }}
      >
        Roll
      </button>
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
    movementDone
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

    // Add start bonus handler
    socket.on('startBonus', ({ playerSocketId, newMoney, amount, reason }) => {
      console.log('[GameScreen] startBonus', { playerSocketId, newMoney, amount, reason });
      
      // Update players' money
      const updated = players.map(p =>
        p.socketId === playerSocketId ? { ...p, money: newMoney } : p
      );
      setPlayers(updated);

      // Update current player's money if they got the bonus
      if (player.socketId === playerSocketId) {
        setPlayer({ ...player, money: newMoney });
        setError(`You received $${amount} for ${reason} Start!`);
        // Clear bonus message after 7 seconds
        setTimeout(() => setError(null), 7000);
      }
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
        setPlayer({ ...player, money: newMoney });
        setError(`You received $${amount} bonus for landing on your property ${propertyName}!`);
        // Clear bonus message after 5 seconds
        setTimeout(() => setError(null), 5000);
      }
    });

    // Add casino result handler for other players
    socket.on('casinoResult', ({ playerId, dice, amount, won, playerName, playerMoney }) => {
      console.log('[GameScreen] casinoResult', { playerId, dice, amount, won, playerName, playerMoney });
      
      // Update player money in the game state
      const updated = players.map(p =>
        p.socketId === playerId ? { ...p, money: playerMoney } : p
      );
      setPlayers(updated);
      
      if (player.socketId === playerId) {
        setPlayer(prev => ({ ...prev, money: playerMoney }));
      } else {
        setError(`${playerName} ${won ? 'won' : 'lost'} $${amount} at the casino!`);
        setTimeout(() => setError(null), 5000);
      }
    });

    // Add roadCash handler
    socket.on('roadCashResult', ({ playerSocketId, newMoney, amount }) => {
      console.log('[GameScreen] roadCashResult', { playerSocketId, newMoney, amount });
      
      // Update player's money
      const updated = players.map(p =>
        p.socketId === playerSocketId ? { ...p, money: newMoney } : p
      );
      setPlayers(updated);

      // Update current player if they got the money
      if (player.socketId === playerSocketId) {
        setPlayer({ ...player, money: newMoney });
        setError(`You received $${amount} from the road!`);
        // Clear message after 5 seconds
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
      position: 'relative'
    }}>
      {/* Side Panel Buttons */}
      {Object.entries(panelConfigs).map(([panelId, config], index) => (
        <div 
          key={panelId}
          onClick={() => setActiveSidePanel(activeSidePanel === panelId ? null : panelId)}
          style={{
            position: 'fixed',
            right: activeSidePanel === panelId ? '540px' : '0',
            top: `${25 + (index * 130)}px`,
            width: activeSidePanel === panelId ? '60px' : '120px',
            height: '120px',
            backgroundColor: 'rgba(0, 0, 0, 0.94)',
            borderColor: 'rgb(52, 52, 52)',
            borderWidth: '2px',
            borderStyle: 'solid', 
            display: activeSidePanel && activeSidePanel !== panelId ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            clipPath: activeSidePanel === panelId
              ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
              : 'polygon(20% 0, 100% 0, 100% 100%, 20% 100%, 0 70%, 0 30%)',
            transition: 'all 0.3s ease',
            zIndex: 1001
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.2em',
            transform: activeSidePanel === panelId ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.3s ease',
            width: '100%',
            padding: '0 10px',
            textAlign: 'center'
          }}>
            {activeSidePanel === panelId ? '←' : config.title}
          </div>
        </div>
      ))}

      {/* Side Panels */}
      {Object.entries(panelConfigs).map(([panelId, config]) => (
        <div
          key={panelId}
          style={{
            position: 'fixed',
            right: activeSidePanel === panelId ? '0' : '-550px',
            top: '0',
            width: '500px',
            height: '100vh',
            backgroundColor: `${config.color}dd`,
            boxShadow: '-2px 0 5px rgba(0, 0, 0, 0.48)',
            transition: 'right 0.3s ease',
        zIndex: 1000,
            padding: '20px',
            color: 'white',
            overflowY: 'auto',
            fontSize: '1.5em',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            marginLeft: '10px'
          }}
        >
          <h2 style={{ marginBottom: '20px' }}>{config.title}</h2>
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
                                 event.message.includes('bonus');
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
                      fontSize: '1.2em',
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
                marginTop: '70px'
              }}>
                <h4 style={{ marginBottom: '15px' , fontSize: '1em', }}>Borrow Money</h4>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '1em',
                  marginBottom: '20px',
                  justifyContent: 'center',
                  alignItems: 'center'
      }}>
        <button
                    onClick={() => setBorrowAmount(Math.max(500, borrowAmount - 500))}
          style={{
            padding: '8px 12px',
                      fontSize: '1.7em',
                      cursor: 'pointer',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
                      color: 'white',
            borderRadius: '4px',
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
                    fontSize: '1.7em'
                  }}>
                    ${borrowAmount}
                  </div>
        <button
                    onClick={() => setBorrowAmount(Math.min(100000, borrowAmount + 500))}
      style={{
            padding: '8px 12px',
                      fontSize: '1.7em',
                      cursor: 'pointer',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
            color: 'white',
                      borderRadius: '4px'
                    }}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (socket) {
                      socket.emit('borrowMoney', { amount: borrowAmount });
                      setBorrowAmount(500); // Reset to default
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
            border: 'none',
                    color: 'white',
            borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1.1em',
                    transition: 'background-color 0.2s'
                  }}
                >
                  Borrow
                </button>
              </div>

              {/* Pay Off Section */}
              <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.33)',
                padding: '20px',
                borderRadius: '8px',
                marginTop: '20px',
                
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
                    disabled={!player?.loan}
                    style={{
                      padding: '8px 12px',
                      fontSize: '1.2em',
                      cursor: player?.loan ? 'pointer' : 'not-allowed',
                      backgroundColor: player?.loan ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '1.7em'
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
                    fontSize: '1.7em'
                  }}>
                    ${Math.min(payoffAmount, player?.loan || 0)}
                  </div>
                  <button
                    onClick={() => setPayoffAmount(Math.min(player?.loan || 0, payoffAmount + 500))}
                    disabled={!player?.loan}
                    style={{
          padding: '8px 12px',
                      fontSize: '1.7em',
                      cursor: player?.loan ? 'pointer' : 'not-allowed',
                      backgroundColor: player?.loan ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      color: 'white',
                      borderRadius: '4px'
                    }}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (socket && player?.loan && player?.money >= payoffAmount) {
                      socket.emit('payoffLoan', { amount: Math.min(payoffAmount, player.loan) });
                      setPayoffAmount(1000); // Reset to default
                    }
                  }}
                  disabled={!player?.loan || player?.money < payoffAmount}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: player?.loan && player?.money >= payoffAmount 
                      ? 'rgba(255, 255, 255, 0.3)' 
                      : 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: 'white',
          borderRadius: '4px',
                    cursor: player?.loan && player?.money >= payoffAmount ? 'pointer' : 'not-allowed',
                    fontSize: '1.1em',
                    transition: 'background-color 0.2s'
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
      </div>

              {/* Status Section */}
              <div style={{
                marginTop: '20px',
                padding: '20px',
                backgroundColor: 'rgba(0, 0, 0, 0.33)',
                borderRadius: '8px',
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

      {/* Main content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        minWidth: '1200px',
        position: 'relative',
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        overflow: 'auto'
      }}>
        {/* RPS Tie Resolver - Positioned absolutely over the board */}
        {rpsTieAmount && (
          <RPSTieResolver
            maxAmount={rpsTieAmount.maxAmount}
            gameId={rpsTieAmount.gameId}
            tiedPlayerId={rpsTieAmount.tiedPlayerId}
            tiedPlayerName={rpsTieAmount.tiedPlayerName}
            socket={socket}
            onResolved={() => {
              setRpsTieAmount(null);
            }}
          />
        )}
        {/* Main content (board & player stats) */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          minWidth: '1080px',
          padding: '20px',
          marginTop: '220px',
          marginBottom: '20px'
        }}>
          {/* Board with centered positioning */}
          <div style={{ 
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          width: '100%',
            height: '100%',
            minHeight: '600px' // Ensure minimum height for the board container
          }}>
            <div style={{ 
              position: 'relative',
              margin: '200px' // Add margin around the board to make space for player stats
            }}>
              <Board />
              <PlayerStats />
            </div>
          </div>
        </div>

        {/* Bottom sections (not fixed anymore) */}
        <div style={{
          width: '60%',
          minWidth: '800px',
          height: '240px',
          minHeight: '400px',
          background: 'rgba(80, 80, 80, 0.9)',
          borderTop: '2px solid #bbb',
          boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.2)',
          zIndex: 100,
          display: 'flex',
          border: '2px solid #666',
          borderRadius: '30px 30px 0 0',
          margin: '80px auto 0 auto'
        }}>
          {/* Dice Roller Section */}
          <div style={{
            flex: 1,
            position: 'relative',
            borderRight: '2px solid #666',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(60, 60, 60, 0.3)',
            borderRadius: '30px 30px 30px 30px',
            overflow: 'hidden'
          }}>
          {isMyTurn && (
              <>
            <img
              src={Dicebox}
              alt="Dice Board"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                    objectPosition: 'center',
                pointerEvents: 'none'
              }}
            />
                {testRollMode && (
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
              </>
            )}
            <DiceRoller 
              testRollMode={testRollMode} 
              hasCasinoPlayed={hasCasinoPlayed}
              style={{ position: 'relative', zIndex: 1 }}
            />
          </div>

          {/* Dashboard Section */}
          <div style={{
            flex: 1,
            borderRight: '2px solid #666',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(60, 60, 60, 0.3)'
          }}>
            <Dashboard />
        </div>

          {/* Events Section */}
          <div style={{
            flex: 1,
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(60, 60, 60, 0.3)',
            borderRadius: '0 10px 0 0'
          }}>
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
                    ) : rpsTieAmount ? (
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
                    padding: '15px 30px',  // Increased padding
                    fontSize: '1.4em',     // Increased font size
                    backgroundColor: player.money >= tileMeta.cost && (player.loan || 0) <= 10000 ? '#4CAF50' : '#ccc',
                    color: player.money >= tileMeta.cost && (player.loan || 0) <= 10000 ? 'white' : '#ff0000',
                        border: 'none',
                    borderRadius: '12px',  // Increased border radius
                    cursor: player.money >= tileMeta.cost && (player.loan || 0) <= 10000 ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',  // Added shadow
                    transition: 'transform 0.2s',
                    ':hover': {
                      transform: 'scale(1.05)'
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

              // Road Cash Game
              if (isMyTurn && tileMeta?.id === 22) {
                return <RoadCash isMyTurn={isMyTurn} socket={socket} />;
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
                    gap: '20px',
                    width: '100%',
                    maxWidth: '600px',
                    padding: '20px',
                    margin: '0 auto'
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
                        border: '3px solid #666',
                        borderRadius: '12px',
                        backgroundImage: `url(${startIcon})`,
                        backgroundSize: '80%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center 40%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        minHeight: '180px',
                        position: 'relative',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        transition: 'transform 0.2s, background-color 0.2s',
                        ':hover': {
                          transform: 'scale(1.02)',
                          backgroundColor: 'rgba(255, 255, 255, 0.2)'
                        }
                      }}
                    >
                      <span style={{
                        padding: '8px 16px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: '0 0 9px 9px',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '1.4em',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
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
                        border: '3px solid #666',
                        borderRadius: '12px',
                        backgroundImage: `url(${roadIcon})`,
                        backgroundSize: '80%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center 40%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        minHeight: '180px',
                        position: 'relative',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        transition: 'transform 0.2s, background-color 0.2s',
                        ':hover': {
                          transform: 'scale(1.02)',
                          backgroundColor: 'rgba(255, 255, 255, 0.2)'
                        }
                      }}
                    >
                      <span style={{
                        padding: '8px 16px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: '0 0 9px 9px',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '1.4em',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
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
                        border: '3px solid #666',
                        borderRadius: '12px',
                        backgroundImage: `url(${hotelIcon})`,
                        backgroundSize: '80%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center 40%',
                        cursor: 'pointer',
            display: 'flex',
                        alignItems: 'flex-end',
            justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        minHeight: '180px',
                        position: 'relative',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        transition: 'transform 0.2s, background-color 0.2s',
                        ':hover': {
                          transform: 'scale(1.02)',
                          backgroundColor: 'rgba(255, 255, 255, 0.2)'
                        }
                      }}
                    >
                      <span style={{
                        padding: '8px 16px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: '0 0 9px 9px',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '1.4em',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
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
                        border: '3px solid #666',
                        borderRadius: '12px',
                        backgroundImage: `url(${casinoIcon})`,
                        backgroundSize: '80%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center 40%',
                        cursor: 'pointer',
            display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        minHeight: '180px',
                        position: 'relative',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        transition: 'transform 0.2s, background-color 0.2s',
                        ':hover': {
                          transform: 'scale(1.02)',
                          backgroundColor: 'rgba(255, 255, 255, 0.2)'
                        }
                      }}
                    >
                      <span style={{
                        padding: '8px 16px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: '0 0 9px 9px',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '1.4em',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
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
                return (
                  <p style={{ color: 'tomato', margin: 0 }}>{error}</p>
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
                      ) : rpsTieAmount ? (
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
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}