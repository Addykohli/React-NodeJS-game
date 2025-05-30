import React, { useContext, useState, useEffect } from 'react';
import { GameContext } from '../context/GameContext';
import Dicebox from '../assets/diceBoard.png';
import { tiles } from '../data/tiles';

const PlayerStats = () => {
  const { players = [], player, currentPlayerId, socket } = useContext(GameContext);
  const [diceRolls, setDiceRolls] = useState({});

  useEffect(() => {
    if (!socket) return;

    const handleDiceRoll = ({ playerId, dice }) => {
      setDiceRolls(prev => ({
        ...prev,
        [playerId]: dice
      }));
    };

    const handleTurnChange = () => {
      setDiceRolls({});
    };

    socket.on('diceRolled', handleDiceRoll);
    socket.on('turnChanged', handleTurnChange);

    return () => {
      socket.off('diceRolled', handleDiceRoll);
      socket.off('turnChanged', handleTurnChange);
    };
  }, [socket]);

  if (!Array.isArray(players) || players.length === 0 || !player || !player.socketId) return null;

  // Show all other players except the local player
  const others = players.filter(p => p && p.socketId !== player.socketId);

  if (others.length === 0) {
    return null;
  }

  // Calculate positions based on number of players
  const getPositions = (numPlayers) => {
    switch(numPlayers) {
      case 1: // Just one other player
        return [{ position: 'left' }];
      case 2: // Two other players
        return [{ position: 'left', top: '25%' }, { position: 'left', top: '75%' }];
      case 3: // Three other players
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'top', left: '50%' }
        ];
      case 4: // Four other players
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'top', left: '33%' },
          { position: 'top', left: '66%' }
        ];
      case 5: // Five other players
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'right', top: '25%' },
          { position: 'right', top: '75%' },
          { position: 'top', left: '50%' }
        ];
      case 6: // Six other players
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'right', top: '25%' },
          { position: 'right', top: '75%' },
          { position: 'top', left: '33%' },
          { position: 'top', left: '66%' }
        ];
      case 7: // Seven other players
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'right', top: '25%' },
          { position: 'right', top: '75%' },
          { position: 'top', left: '25%' },
          { position: 'top', left: '50%' },
          { position: 'top', left: '75%' }
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

        const style = {
          position: 'absolute',
          border: '1px solid black',
          padding: '16px',
          background: 'rgba(80, 80, 80, 0.61)',
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

        // Calculate dice board container style - only position and size
        const diceContainerStyle = {
          position: 'absolute',
          width: '288px',
          zIndex: 0,
          ...(pos.position === 'top' ? {
            bottom: 'calc(100% + 350px )', // 82px is the height of stats box + 2px gap
            left: pos.left || '50%',
            transform: 'translate(-50%, 0)'
          } : {
            ...(pos.position === 'left' ? { right: 'calc(100% + 260px)' } : { left: 'calc(100% + 235px)' }),
            top: pos.top || '50%',
            transform: 'translate(0, calc(-50% + 175px))' // Move down by stats box height + 2px
          })
        };

        return (
          <div key={p.socketId || idx}>
            <div style={style}>
              <strong style={{ fontSize: '1.6rem' }}>{p.name}</strong>'s Stats<br />
              <div style={{ marginTop: '8px' }}>
                Money: ${typeof p.money === 'number' ? p.money.toLocaleString() : 0}
              </div>
              <div style={{ marginBottom: '5px' }}>
                Loan: ${p.loan || 0}
              </div>
              <div style={{ 
                fontSize: '1.4rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                paddingTop: '5px',
                marginTop: '5px'
              }}>
                At: {tiles.find(t => t.id === p.tileId)?.name || 'Unknown'}
              </div>
            </div>
            {(isCurrentPlayer || playerDice) && (
              <div style={diceContainerStyle}>
                <img
                  src={Dicebox}
                  alt="Dice Board"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'fill'
                  }}
                />
                {playerDice && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    gap: '16px'
                  }}>
                    {playerDice.map((value, i) => (
                      <img
                        key={i}
                        src={`/dice${value}.png`}
                        alt={`Dice ${value}`}
                        style={{
                          width: '64px',
                          height: '64px'
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

export default PlayerStats;