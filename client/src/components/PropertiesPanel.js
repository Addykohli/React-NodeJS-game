import React, { useState, useContext, useEffect, useMemo } from 'react';
import { GameContext } from '../context/GameContext';
import { tiles } from '../data/tiles';

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

  // Group properties by division and sort by cost (highest first)
  const propertiesByDivision = useMemo(() => {
    const divisions = {};
    tiles
      .filter(tile => tile.type === 'property' && tile.division)
      .forEach(property => {
        if (!divisions[property.division]) {
          divisions[property.division] = [];
        }
        divisions[property.division].push(property);
      });
    

    Object.values(divisions).forEach(properties => {
      properties.sort((a, b) => (b.cost || 0) - (a.cost || 0));
    });
    
    return divisions;
  }, []);
  
  const [expandedDivisions, setExpandedDivisions] = useState({});
  
  const toggleDivision = (division) => {
    setExpandedDivisions(prev => ({
      ...prev,
      [division]: !prev[division]
    }));
  };
  
  const getOwnerColor = (tile) => {
    const owner = players?.find(p => p.properties?.includes(tile.id));
    if (!owner) return 'rgba(255, 255, 255, 0.6)';
    return owner.socketId === player?.socketId 
      ? 'rgba(0, 255, 0, 0.6)' 
      : 'rgba(255, 0, 0, 0.6)';
  };

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
      
      {/* Catalog Section */}
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
          CATALOG
        </h3>
        
        {Object.entries(propertiesByDivision).map(([division, properties]) => (
          <div key={division} style={{ marginBottom: '20px' }}>
            <button
              onClick={() => toggleDivision(division)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '18px',
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
                transition: 'all 0.2s'
              }}
            >
              <span>{division.charAt(0).toUpperCase() + division.slice(1)}</span>
              <span>{expandedDivisions[division] ? '−' : '+'}</span>
            </button>
            
            {expandedDivisions[division] && (
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: '6px',
                padding: '10px',
                marginTop: '5px'
              }}>
                {properties.map(property => {
                  const ownerColor = getOwnerColor(property);
                  return (
                    <div 
                      key={property.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 12px',
                        margin: '5px 0',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        borderRadius: '4px',
                        borderLeft: `4px solid ${ownerColor}`
                      }}
                    >
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: ownerColor,
                        marginRight: '12px',
                        flexShrink: 0
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold' }}>{property.name}</div>
                        <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
                          ${property.cost?.toLocaleString() || 'N/A'} • Rent: ${property.rent?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertiesPanel;
