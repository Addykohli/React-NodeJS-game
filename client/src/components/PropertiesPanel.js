import React, { useState, useContext, useEffect } from 'react';
import { GameContext } from '../context/GameContext';

const PropertiesPanel = () => {
  const { player, players } = useContext(GameContext);
  const [showOwnership, setShowOwnership] = useState(() => {
    const saved = localStorage.getItem('showOwnershipView');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('showOwnershipView', showOwnership);
  }, [showOwnership]);
  const toggleOwnershipView = () => {
    setShowOwnership(prev => !prev);
  };

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
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={toggleOwnershipView}
          style={{
            backgroundColor: showOwnership ? '#4CAF50' : '#f44336',
            color: 'white',
            border: 'none',
            padding: '15px 30px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '24px',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            margin: '20px 0'
          }}
        >
          <span>Toggle Ownership View</span>
          <span style={{ 
            fontSize: '28px',
            fontWeight: 'bold',
            padding: '0 10px',
            borderRadius: '4px',
            backgroundColor: 'rgba(0,0,0,0.2)'
          }}>
            {showOwnership ? 'ON' : 'OFF'}
          </span>
        </button>
        <p style={{ 
          margin: '15px 0', 
          fontSize: '20px', 
          opacity: 0.9,
          lineHeight: '1.5',
          padding: '10px',
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: '6px'
        }}>
          {showOwnership 
            ? 'Ownership view is enabled. Property indicators are shown on the board.'
            : 'Ownership view is disabled. Enable to see property indicators.'}
        </p>
      </div>
      
      <div style={{ 
        marginTop: '40px',
        padding: '20px',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: '10px'
      }}>
        <h3 style={{ 
          color: '#fff', 
          margin: '0 0 20px 0',
          fontSize: '26px',
          fontWeight: 'bold',
          paddingBottom: '10px',
          borderBottom: '2px solid rgba(255,255,255,0.2)'
        }}>
          LEGEND
        </h3>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px' 
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '20px' 
          }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              backgroundColor: 'rgba(0, 255, 0, 0.4)',
              border: '2px solid rgba(255, 255, 255, 0.7)',
              borderRadius: '4px'
            }}></div>
            <span style={{ fontSize: '22px' }}>Your Properties</span>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '20px' 
          }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              backgroundColor: 'rgba(255, 0, 0, 0.4)',
              border: '2px solid rgba(255, 255, 255, 0.7)',
              borderRadius: '4px'
            }}></div>
            <span style={{ fontSize: '22px' }}>Other Players' Properties</span>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '20px' 
          }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              backgroundColor: 'rgba(255, 255, 255, 0.4)',
              border: '2px solid rgba(255, 255, 255, 0.7)',
              borderRadius: '4px'
            }}></div>
            <span style={{ fontSize: '22px' }}>Unowned Properties</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
