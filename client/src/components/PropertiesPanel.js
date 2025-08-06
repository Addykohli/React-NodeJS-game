import React, { useState, useContext, useEffect } from 'react';
import { GameContext } from '../context/GameContext';

const PropertiesPanel = () => {
  const { socket, player } = useContext(GameContext);
  const [showOwnership, setShowOwnership] = useState(false);

  useEffect(() => {
    if (!socket) return;
    
    const handleOwnershipView = ({ show }) => {
      console.log('Received ownership view update:', show);
      setShowOwnership(show);
    };

    socket.on('toggleOwnershipView', handleOwnershipView);
    
    return () => {
      socket.off('toggleOwnershipView', handleOwnershipView);
    };
  }, [socket]);

  const toggleOwnershipView = () => {
    const newState = !showOwnership;
    console.log('Toggling ownership view to:', newState);
    setShowOwnership(newState);
    
    if (socket) {
      console.log('Emitting toggleOwnershipView event');
      socket.emit('toggleOwnershipView', { 
        show: newState, 
        playerId: player?.socketId 
      });
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
