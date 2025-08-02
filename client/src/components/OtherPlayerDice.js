import React from 'react';
import { GameContext } from '../context/GameContext';

// Import dice images
import dice1 from '../assets/dice/dice1.png';
import dice2 from '../assets/dice/dice2.png';
import dice3 from '../assets/dice/dice3.png';
import dice4 from '../assets/dice/dice4.png';
import dice5 from '../assets/dice/dice5.png';
import dice6 from '../assets/dice/dice6.png';

const diceImages = {
  1: dice1,
  2: dice2,
  3: dice3,
  4: dice4,
  5: dice5,
  6: dice6
};

export default function OtherPlayerDice() {
  const { players, player, currentPlayerId } = React.useContext(GameContext);
  const [rolls, setRolls] = React.useState({});

  React.useEffect(() => {
    if (!player?.socket) {
      console.log('No player socket available');
      return;
    }

    console.log('Setting up dice roll listener for player:', player.socketId, 'currentPlayerId:', currentPlayerId);

    const handleDiceRoll = (data) => {
      console.log('=== DICE ROLL EVENT RECEIVED ===');
      console.log('Event data:', data);
      console.log('Current player socket ID:', player.socketId);
      console.log('Current player ID from context:', currentPlayerId);
      
      // Log all players for debugging
      console.log('All players:', players);
      
      // First, check if this is a roll from another player
      if (data.playerId === player.socketId) {
        console.log('Ignoring roll - from current player');
        return;
      }
      
      if (data.playerId === currentPlayerId) {
        console.log('Ignoring roll - from current turn player');
        return;
      }
      
      console.log('Processing roll from other player:', data.playerId);
      
      // Find the player who rolled
      const rollingPlayer = players.find(p => p.socketId === data.playerId);
      console.log('Found rolling player:', rollingPlayer);
      
      const newRoll = {
        die1: data.die1,
        die2: data.die2,
        playerName: rollingPlayer?.name || `Player ${data.playerId.slice(0, 5)}`,
        timestamp: Date.now()
      };
      
      console.log('Adding new roll to state:', newRoll);
      
      setRolls(prev => {
        const updated = {
          ...prev,
          [data.playerId]: newRoll
        };
        console.log('Updated rolls state:', updated);
        return updated;
      });
    };

    // Listen for both the original and forwarded events for debugging
    player.socket.on('playerDiceRoll', handleDiceRoll);
    player.socket.on('forwardedPlayerDiceRoll', handleDiceRoll);

    return () => {
      player.socket.off('playerDiceRoll', handleDiceRoll);
      player.socket.off('forwardedPlayerDiceRoll', handleDiceRoll);
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

  // Log the current state for debugging
  console.log('Current rolls state:', rolls);
  console.log('Dice images loaded:', Object.entries(diceImages).map(([key, value]) => ({
    key,
    path: value.default || value,
    exists: !!value
  })));

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 1000
    }}>
      {Object.keys(rolls).length === 0 ? (
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: '15px',
          borderRadius: '8px',
          color: 'white',
          textAlign: 'center',
          minWidth: '150px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}>
          Waiting for your turn...
        </div>
      ) : (
        Object.entries(rolls).map(([playerId, roll]) => (
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
                src={diceImages[roll.die1]} 
                alt={`Die ${roll.die1}`} 
                width={40} 
                height={40} 
                onError={(e) => console.error('Error loading die image:', e.target.src)}
              />
              <img 
                src={diceImages[roll.die2]} 
                alt={`Die ${roll.die2}`} 
                width={40} 
                height={40}
                onError={(e) => console.error('Error loading die image:', e.target.src)}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
