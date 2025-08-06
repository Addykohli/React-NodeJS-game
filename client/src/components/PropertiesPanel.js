import React, { useState, useContext, useEffect } from 'react';
import { GameContext } from '../context/GameContext';

const PropertiesPanel = () => {
  const { player, players } = useContext(GameContext);
  const [showOwnership, setShowOwnership] = useState(() => {
    // Load the saved state from localStorage or default to false
    const saved = localStorage.getItem('showOwnershipView');
    return saved === 'true';
  });

  // Save the state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('showOwnershipView', showOwnership);
  }, [showOwnership]);

  // Toggle the ownership view
  const toggleOwnershipView = () => {
    setShowOwnership(prev => !prev);
  };

  // Emit an event to notify the Board component about the toggle
  useEffect(() => {
    const event = new CustomEvent('ownershipViewToggle', { detail: { show: showOwnership } });
    window.dispatchEvent(event);
  }, [showOwnership]);

  return (
    <div style={{ 
      width: '100%',
      height: '100%',
      padding: '20px',
      color: 'white',
      overflowY: 'auto'
    }}>
      <h2 style={{ 
        color: 'white',
        borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
        paddingBottom: '10px',
        marginBottom: '20px'
      }}>
        Properties
      </h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={toggleOwnershipView}
          style={{
            backgroundColor: showOwnership ? '#4CAF50' : '#f44336',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'background-color 0.3s',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <span>Toggle Ownership View</span>
          <span>{showOwnership ? 'ON' : 'OFF'}</span>
        </button>
        <p style={{ marginTop: '10px', fontSize: '14px', opacity: 0.8 }}>
          {showOwnership 
            ? 'Ownership view is enabled. Property indicators are shown on the board.'
            : 'Ownership view is disabled. Enable to see property indicators.'}
        </p>
      </div>
      
      <div style={{ marginTop: '30px' }}>
        <h3 style={{ color: '#fff', marginBottom: '15px' }}>Legend</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '20px', 
              height: '20px', 
              backgroundColor: 'rgba(0, 255, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.5)'
            }}></div>
            <span>Your Properties</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '20px', 
              height: '20px', 
              backgroundColor: 'rgba(255, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.5)'
            }}></div>
            <span>Other Players' Properties</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '20px', 
              height: '20px', 
              backgroundColor: 'rgba(255, 255, 255, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.5)'
            }}></div>
            <span>Unowned Properties</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
