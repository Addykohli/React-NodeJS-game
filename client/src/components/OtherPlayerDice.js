import React from 'react';
import { GameContext } from '../context/GameContext';

const diceImages = {};
for (let i = 1; i <= 6; i++) {
  diceImages[i] = require(`../assets/dice/dice${i}.png`);
}

export default function OtherPlayerDice() {
  const { players, player, currentPlayerId } = React.useContext(GameContext);
  const [rolls, setRolls] = React.useState({});

  React.useEffect(() => {
    if (!player?.socket) return;

    const handleDiceRoll = (data) => {
      if (data.playerId !== player.socketId && data.playerId !== currentPlayerId) {
        setRolls(prev => ({
          ...prev,
          [data.playerId]: {
            die1: data.die1,
            die2: data.die2,
            playerName: players.find(p => p.socketId === data.playerId)?.name || 'Player',
            timestamp: Date.now()
          }
        }));
      }
    };

    player.socket.on('playerDiceRoll', handleDiceRoll);

    return () => {
      player.socket.off('playerDiceRoll', handleDiceRoll);
    };
  }, [player, players, currentPlayerId]);

  // Remove old rolls (older than 5 seconds)
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRolls(prev => {
        const updated = {};
        Object.entries(prev).forEach(([playerId, roll]) => {
          if (now - roll.timestamp < 5000) {
            updated[playerId] = roll;
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (Object.keys(rolls).length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 1000
    }}>
      {Object.entries(rolls).map(([playerId, roll]) => (
        <div key={playerId} style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: '10px',
          borderRadius: '8px',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}>
          <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>
            {roll.playerName} rolled:
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <img 
              src={diceImages[roll.die1].default} 
              alt={`Die ${roll.die1}`} 
              width={40} 
              height={40} 
            />
            <img 
              src={diceImages[roll.die2].default} 
              alt={`Die ${roll.die2}`} 
              width={40} 
              height={40} 
            />
          </div>
        </div>
      ))}
    </div>
  );
}
