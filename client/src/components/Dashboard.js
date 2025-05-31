import React, { useContext, useEffect, useCallback } from 'react';
import { GameContext } from '../context/GameContext';
import { tiles } from '../data/tiles';

export default function Dashboard() {
  const { player } = useContext(GameContext);
  
  const updateDisplay = useCallback(() => {
    console.log('[Dashboard] Player money updated:', {
      playerName: player?.name,
      money: player?.money,
      loan: player?.loan
    });
  }, [player?.money, player?.loan, player?.name]);

  useEffect(() => {
    updateDisplay();
  }, [updateDisplay]);

  if (!player) return null;

  const currentTile = tiles.find(t => t.id === player.tileId) || { name: 'Unknown' };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      marginTop: '1.5rem'
    }}>
      <div style={{
        border: '2px solid #444',
        borderRadius: 10,
        padding: '1.5rem 2rem',
        width: '80%',
        maxWidth: 700,
        backgroundColor: '#fff',
        boxShadow: '0 2px 6px rgba(99, 11, 11, 0.1)',
        textAlign: 'center'
      }}>
        <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>{player.name}'s Dashboard</h3>
        <div style={{ 
          color: '#4CAF50', 
          marginBottom: '10px',
          fontSize: '2rem',
          fontWeight: 'bold'
        }}>
          Money: ${player?.money?.toLocaleString() || 0}
        </div>
        <div style={{ 
          color: '#f44336', 
          marginBottom: '10px',
          fontSize: '2rem',
          fontWeight: 'bold'
        }}>
          Loan: ${player?.loan?.toLocaleString() || 0}
        </div>
        <div style={{ 
          color: '#2196F3', 
          marginBottom: '10px',
          fontSize: '2rem',
          fontWeight: 'bold'
        }}>
          At: {currentTile.name}
        </div>
      </div>
    </div>
  );
}
