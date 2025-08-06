import React, { useState, useContext } from 'react';
import { GameContext } from './GameContext';

const PropertiesPanel = () => {
  const { socket, player } = useContext(GameContext);
  const [showOwnership, setShowOwnership] = useState(false);

  const toggleOwnershipView = () => {
    const newState = !showOwnership;
    setShowOwnership(newState);
    // Emit an event to update the board's ownership view
    if (socket) {
      socket.emit('toggleOwnershipView', { show: newState, playerId: player?.socketId });
    }
  };

  return (
    <div style={{ padding: '10px' }}>
      <h3>Property View</h3>
      <div style={{ marginTop: '15px' }}>
        <button 
          onClick={toggleOwnershipView}
          style={{
            backgroundColor: showOwnership ? '#4CAF50' : '#f44336',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            textAlign: 'center',
            textDecoration: 'none',
            display: 'inline-block',
            fontSize: '14px',
            margin: '4px 2px',
            cursor: 'pointer',
            borderRadius: '4px',
          }}
        >
          {showOwnership ? 'Ownership View: ON' : 'Ownership View: OFF'}
        </button>
      </div>
    </div>
  );
};

export default PropertiesPanel;
