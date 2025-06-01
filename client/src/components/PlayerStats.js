import React, { useContext, useEffect, useState } from 'react';
import { GameContext } from '../context/GameContext';
import Dicebox from '../assets/diceBoard.png';
import { tiles } from '../data/tiles';

const PlayerStats = () => {
  const { players, player, currentPlayerId, diceRoll, socket } = useContext(GameContext);
  const [diceRolls, setDiceRolls] = useState({});

  // Listen for all money and property changing events
  useEffect(() => {
    if (!socket) return;

    const handleStateUpdate = () => {
      // Force a re-render by updating dice rolls state
      setDiceRolls(prev => ({ ...prev }));
    };

    // Subscribe to all money and property changing events
    socket.on('rentPaid', handleStateUpdate);
    socket.on('startBonus', handleStateUpdate);
    socket.on('propertyUpdated', handleStateUpdate);
    socket.on('casinoResult', handleStateUpdate);
    socket.on('roadCashResult', handleStateUpdate);
    socket.on('loanUpdated', handleStateUpdate);
    socket.on('tradeAccepted', handleStateUpdate);
    socket.on('playerMoved', handleStateUpdate);

    return () => {
      // Cleanup all event listeners
      socket.off('rentPaid', handleStateUpdate);
      socket.off('startBonus', handleStateUpdate);
      socket.off('propertyUpdated', handleStateUpdate);
      socket.off('casinoResult', handleStateUpdate);
      socket.off('roadCashResult', handleStateUpdate);
      socket.off('loanUpdated', handleStateUpdate);
      socket.off('tradeAccepted', handleStateUpdate);
      socket.off('playerMoved', handleStateUpdate);
    };
  }, [socket]);

  // Update dice rolls when a new roll happens
  useEffect(() => {
    if (diceRoll) {
      setDiceRolls(prev => ({
        ...prev,
        [diceRoll.playerId]: diceRoll
      }));
    }
  }, [diceRoll]);

  // Filter out current player and get others
  const others = players.filter(p => p && p.socketId !== player?.socketId);

  // Get positions based on number of players
  const getPositions = (numPlayers) => {
    switch(numPlayers) {
      case 1: // Just one other player
        return [{ position: 'left' }];
      case 2: // Two other players
        return [{ position: 'left', top: '25%' }, { position: 'left', top: '75%' }];
      case 3: // Three other players
        return [
          { position: 'left', top: '100%' },
          { position: 'left', top: '75%' },
          { position: 'top' }
        ];
      case 4: // Four other players
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'top' },
          { position: 'top' }
        ];
      case 5: // Five other players
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'right', top: '25%' },
          { position: 'right', top: '75%' },
          { position: 'top' }
        ];
      case 6: // Six other players
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'right', top: '25%' },
          { position: 'right', top: '75%' },
          { position: 'top' },
          { position: 'top' }
        ];
      case 7: // Seven other players
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'right', top: '25%' },
          { position: 'right', top: '75%' },
          { position: 'top' },
          { position: 'top' },
          { position: 'top' }
        ];
      default:
        return [];
    }
  };

  const positions = getPositions(others.length);

  return (
    <>
      {others.map((p, idx) => {
        const pos = positions[idx];
        if (!pos) return null;

        const isCurrentPlayer = p.socketId === currentPlayerId;
        const playerDice = diceRolls[p.socketId];
        const currentTile = tiles.find(t => t.id === p.tileId)?.name || 'Unknown';

        const style = {
          position: 'absolute',
          border: '1px solid black',
          padding: '16px',
          background: isCurrentPlayer ? 'rgba(76, 175, 80, 0.61)' : 'rgba(80, 80, 80, 0.61)',
          fontSize: '1.5rem',
          color: 'white',
          width: '260px',
          borderRadius: '12px',
          boxShadow: '0 3px 6px rgba(0,0,0,0.2)',
          zIndex: 1
        };

        // Apply position based on placement
        if (pos.position === 'left') {
          style.right = 'calc(100% + 235px)';
          style.top = pos.top || '50%';
          style.transform = 'translate(0, -50%)';
        } else if (pos.position === 'right') {
          style.left = 'calc(100% + 235px)';
          style.top = pos.top || '50%';
          style.transform = 'translate(0, -50%)';
        } else if (pos.position === 'top') {
          style.bottom = 'calc(100% + 200px)';
          style.left = pos.left || '50%';
          style.transform = 'translate(-50%, 0)';
        }

        return (
          <div key={p.socketId} style={style}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>{p.name}</div>
            <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>
              Money: ${p.money?.toLocaleString() || 0}
            </div>
            {p.loan > 0 && (
              <div style={{ fontSize: '1.2rem', marginBottom: '4px', color: '#ff6b6b' }}>
                Loan: ${p.loan?.toLocaleString()}
              </div>
            )}
            <div style={{ fontSize: '1.2rem' }}>
              At: {currentTile}
            </div>
            {playerDice && (
              <div style={{ 
                marginTop: '8px',
                display: 'flex',
                gap: '8px',
                justifyContent: 'center'
              }}>
                <img 
                  src={`/dice/dice${playerDice.die1}.png`}
                  alt={`Die ${playerDice.die1}`}
                  width={40}
                  height={40}
                />
                <img 
                  src={`/dice/dice${playerDice.die2}.png`}
                  alt={`Die ${playerDice.die2}`}
                  width={40}
                  height={40}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

export default PlayerStats;