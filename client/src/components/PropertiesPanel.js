import React, { useContext } from 'react';
import { GameContext } from '../context/GameContext';

const PropertiesPanel = () => {
  const { showOwnership, toggleOwnershipView } = useContext(GameContext);
  
  const handleToggle = () => {
    console.log('Toggling ownership view');
    toggleOwnershipView();
  };

  return (
    <div style={{ padding: '10px' }}>
      <h3>Property View</h3>
      <div style={{ marginTop: '15px' }}>
        <button 
          onClick={handleToggle}
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
