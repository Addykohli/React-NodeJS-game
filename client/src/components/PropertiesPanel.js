import React, { useState, useEffect, useContext } from 'react';
import { GameContext } from '../context/GameContext';

const PropertiesPanel = () => {
  const [showOwnership, setShowOwnership] = useState(false);
  const { socket } = useContext(GameContext);
  const { player } = useContext(GameContext);
  
  const toggleOwnershipView = () => {
    const newValue = !showOwnership;
    setShowOwnership(newValue);
    // Emit the toggle state to the server so it can be broadcast to all players
    socket.emit('toggleOwnershipView', { playerId: player?.socketId, show: newValue });
  };

  return (
    <div style={{ padding: '10px' }}>
      <h3>Properties</h3>
      <button 
        onClick={toggleOwnershipView}
        style={{
          backgroundColor: showOwnership ? '#4CAF50' : '#f44336',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          textAlign: 'center',
          textDecoration: 'none',
          display: 'inline-block',
          fontSize: '14px',
          margin: '4px 2px',
          cursor: 'pointer',
          borderRadius: '4px',
        }}
      >
        {showOwnership ? 'Hide Ownership' : 'Show Ownership'}
      </button>
    </div>
  );
};

export default PropertiesPanel;
