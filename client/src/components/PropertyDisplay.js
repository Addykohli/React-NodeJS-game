import React, { useState, useContext, useEffect } from 'react';
import { tiles } from '../data/tiles';
import { GameContext } from '../context/GameContext';

const PropertyCard = ({ property,socket, playerId, player }) => {
  const { player: currentPlayer } = useContext(GameContext);
  

  const handleSell = (e) => {
    e.stopPropagation(); 
    if (window.confirm(`Are you sure you want to sell ${property.name} for $${property.cost}?`)) {
      socket.emit('updateProperty', {
        playerId: playerId,
        propertyId: property.id,
        action: 'remove',
        refundAmount: property.cost
      });
    }
  };

  
  const getRentMultiplier = () => {
    if (!player?.properties) return 1;
    
    const ownedProperties = tiles.filter(tile => player.properties.includes(tile.id));
    const divisionProperties = ownedProperties.filter(tile => tile.division === property.division);
    const count = divisionProperties.length;

    if (property.division === 'tech') {
      if (count >= 6) return 5;
      if (count >= 5) return 4;
      
      const hasGoogle = player.properties.includes(37);
      const hasApple = player.properties.includes(36);
      const hasAmazon = player.properties.includes(41);
      
      if (hasGoogle && hasApple && hasAmazon) return 3;
      
      
      const bigTechCount = [hasGoogle, hasApple, hasAmazon].filter(Boolean).length;
      if (bigTechCount >= 2) return 2;
      
      if (count >= 3) return 2;
      return 1;
    } else {
      if (count >= 6) return 5;
      if (count >= 5) return 3;
      if (count >= 3) return 2;
      return 1;
    }
  };

  const multiplier = getRentMultiplier();
  const isCurrentPlayer = playerId === currentPlayer?.socketId;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      color: '#333',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      height: '100%',
      position: 'relative'
    }}>
      <div style={{
        fontSize: '1.4rem',
        marginBottom: '10px',
        textAlign: 'left',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '176px',
        width: '100%'
      }}>
        {property.name}
      </div>
      <div style={{
        fontSize: '1rem',
        textAlign: 'left',
        marginBottom: '8px'
      }}>
        Cost: ${property.cost}
      </div>
      <div style={{
        fontSize: '1rem',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px'
      }}>
        Rent: ${property.rent}
        {multiplier > 1 && (
          <span style={{ 
            color: '#FFA500', 
            fontSize: '1.3em', 
            fontWeight: 'bold'
          }}>
            X{multiplier}
          </span>
        )}
      </div>
      {isCurrentPlayer && (
        <div style={{
          width: '100%',
          textAlign: 'left'
        }}>
          <button
            onClick={handleSell}
            style={{
              backgroundColor: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}
          >
            Sell
          </button>
        </div>
      )}
    </div>
  );
};

const PropertyDisplayLeft = ({ player, position }) => {
  const socket= useContext(GameContext);
  const [expandedIndex, setExpandedIndex] = useState(null);
  
  
  const ownedProperties = tiles
    .filter(tile => tile.type === 'property')
    .filter(tile => player?.properties?.includes(tile.id))
    .sort((a, b) => {
      if (a.division === b.division) {
        return a.name.localeCompare(b.name); 
      }
      return a.division.localeCompare(b.division); 
    });

  const handlePropertyClick = (index) => {
    if (index === ownedProperties.length - 1) return;
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const cardWidth = 196; 
  const cardHeight = 147; 
  const cardOverlap = 39; 
  const expandOffset = 108; 

  const stackHeight = ownedProperties.length * cardOverlap + (expandedIndex !== null ? expandOffset : 0);
  
  const centerOffset = position === 'top' ? -150 : 150; 

  return (
    <div style={{
      position: 'absolute',
      right: '100%',
      top: position === 'top' ? '55%' : '100%',
      transform: `translate(5px, calc(${position === 'top' ? '-50%' : '-135%'} + ${centerOffset}px - ${(ownedProperties.length - 1) * cardOverlap / 2}px ${position === 'top' ? '- 100px' : '+ -200px'}))`,
      width: cardWidth + 'px',
      display: 'flex',
      alignItems: 'flex-start',
      overflow: 'visible',
      height: stackHeight + 'px',
      zIndex: 1
    }}>
      {ownedProperties.map((property, index) => {
        const isLastProperty = index === ownedProperties.length - 1;
        const isExpanded = isLastProperty || expandedIndex === index;
        
        const basePosition = index * cardOverlap;
        let expandedOffset = 0;
        if (expandedIndex !== null && index > expandedIndex) {
          expandedOffset = expandOffset;
        }
        const finalPosition = basePosition + expandedOffset;
        
        return (
          <div
            key={property.id}
            onClick={() => !isLastProperty && handlePropertyClick(index)}
            style={{
              width: cardWidth + 'px',
              height: cardHeight + 'px',
              border: '2px solid #666',
              borderRadius: '8px',
              position: 'absolute',
              top: finalPosition,
              transition: 'all 0.3s ease',
              zIndex: isExpanded ? ownedProperties.length : index,
              display: 'flex',
              flexDirection: 'column',
              padding: '10px',
              boxSizing: 'border-box',
              backgroundColor: 'rgb(200, 240, 264)',
              cursor: isLastProperty ? 'default' : 'pointer',
              boxShadow: 'rgba(50, 50, 50, 0.5) 0px 2px 4px'
            }}
          >
            <PropertyCard
              property={property}
              isExpanded={isExpanded}
              isLastProperty={isLastProperty}
              socket={socket}
              playerId={player.socketId}
              player={player}
            />
          </div>
        );
      })}
    </div>
  );
};

const PropertyDisplayRight = ({ player, position }) => {
  const socket= useContext(GameContext);
  const [expandedIndex, setExpandedIndex] = useState(null);
  
  
  const ownedProperties = tiles
    .filter(tile => tile.type === 'property')
    .filter(tile => player?.properties?.includes(tile.id))
    .sort((a, b) => {
      if (a.division === b.division) {
        return a.name.localeCompare(b.name); 
      }
      return a.division.localeCompare(b.division); 
    });

  const handlePropertyClick = (index) => {
    if (index === ownedProperties.length - 1) return;
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const cardWidth = 196; 
  const cardHeight = 147; 
  const cardOverlap = 39; 
  const expandOffset = 108; 

  const stackHeight = ownedProperties.length * cardOverlap + (expandedIndex !== null ? expandOffset : 0);
  
  const centerOffset = position === 'top' ? -150 : 150; 

  return (
    <div style={{
      position: 'absolute',
      left: '100%',
      top: position === 'top' ? '50%' : '100%',
      transform: `translate(-5px, calc(${position === 'top' ? '-50%' : '-75%'} + ${centerOffset}px - ${(ownedProperties.length - 1) * cardOverlap / 2}px ${position === 'top' ? '- 100px' : '+ -200px'}))`,
      width: cardWidth + 'px',
      display: 'flex',
      alignItems: 'flex-start',
      overflow: 'visible',
      height: stackHeight + 'px',
      zIndex: 1
    }}>
      {ownedProperties.map((property, index) => {
        const isLastProperty = index === ownedProperties.length - 1;
        const isExpanded = isLastProperty || expandedIndex === index;
        
        const basePosition = index * cardOverlap;
        let expandedOffset = 0;
        if (expandedIndex !== null && index > expandedIndex) {
          expandedOffset = expandOffset;
        }
        const finalPosition = basePosition + expandedOffset;
      

        return (
          <div
            key={property.id}
            onClick={() => !isLastProperty && handlePropertyClick(index)}
            style={{
              width: cardWidth + 'px',
              height: cardHeight + 'px',
              border: '2px solid #666',
              borderRadius: '8px',
              position: 'absolute',
              top: finalPosition,
              transition: 'all 0.3s ease',
              zIndex: isExpanded ? ownedProperties.length : index,
              display: 'flex',
              flexDirection: 'column',
              padding: '10px',
              boxSizing: 'border-box',
              backgroundColor: 'rgb(200, 240, 264)',
              cursor: isLastProperty ? 'default' : 'pointer',
              boxShadow: 'rgba(50, 50, 50, 0.5) 0px 2px 4px'
            }}
          >
            <PropertyCard
              property={property}
              isExpanded={isExpanded}
              isLastProperty={isLastProperty}
              socket={socket}
              playerId={player.socketId}
              player={player}
            />
          </div>
        );
      })}
    </div>
  );
};

const PropertyDisplay = () => {
  const { players, player, currentPlayerId, socket, setPlayer, setPlayers } = useContext(GameContext);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [keyInput, setKeyInput] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        const commands = keyInput.trim().toLowerCase();
        
        const ownMatches = commands.matchAll(/own(\d+)/g);
        const matchesArray = Array.from(ownMatches);
        for (const match of matchesArray) {
          const propertyId = parseInt(match[1], 10);
          const property = tiles.find(tile => tile.id === propertyId);
          if (property) {
            socket.emit('updateProperty', {
              playerId: player.socketId,
              propertyId: propertyId,
              action: 'add'
            });
          }
        }
        
        setKeyInput('');
      } else if (e.key.match(/^[0-9a-z]$/i)) {
        setKeyInput(prev => prev + e.key);
      }
    };

    const handlePropertyUpdate = ({ playerId, propertyId, action, newMoney }) => {
      setPlayers(prevPlayers => {
        return prevPlayers.map(p => {
          if (p.socketId === playerId) {
            return {
              ...p,
              properties: action === 'add' 
                ? [...(p.properties || []), propertyId]
                : (p.properties || []).filter(id => id !== propertyId),
              money: newMoney
            };
          }
          return p;
        });
      });

      if (player?.socketId === playerId) {
        setPlayer(prev => ({
          ...prev,
          properties: action === 'add'
            ? [...(prev.properties || []), propertyId]
            : (prev.properties || []).filter(id => id !== propertyId),
          money: newMoney
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    socket.on('propertyUpdated', handlePropertyUpdate);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      socket.off('propertyUpdated', handlePropertyUpdate);
    };
  }, [keyInput, currentPlayerId, setPlayer, socket, player?.socketId, setPlayers]);

  const ownedProperties = tiles
    .filter(tile => tile.type === 'property')
    .filter(tile => player?.properties?.includes(tile.id))
    .sort((a, b) => {
      if (a.division === b.division) {
        return a.name.localeCompare(b.name); 
      }
      return a.division.localeCompare(b.division); 
    });

  const handlePropertyClick = (index) => {
    if (index === ownedProperties.length - 1) return;
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const otherPlayers = players.filter(p => p && p.socketId !== player?.socketId);
  
  if (!players || players.length === 0 || !player) {
    return (
      <div style={{
        color: '#fff',
        fontSize: '1.2em',
        textAlign: 'center',
        padding: '10px'
      }}>
        Loading properties...
      </div>
    );
  }

  
  const getPositions = (numPlayers) => {
    switch(numPlayers) {
      case 1: 
        return [{ position: 'left' }];
      case 2: 
        return [{ position: 'left', top: '25%' }, { position: 'left', top: '75%' }];
      case 3: 
        return [
          { position: 'left', top: '100%' },
          { position: 'left', top: '75%' },
          { position: 'top' }
        ];
      case 4: 
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'top' },
          { position: 'top' }
        ];
      case 5: 
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'right', top: '25%' },
          { position: 'right', top: '75%' },
          { position: 'top' }
        ];
      case 6: 
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'right', top: '25%' },
          { position: 'right', top: '75%' },
          { position: 'top' },
          { position: 'top' }
        ];
      case 7: 
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'right', top: '25%' },
          { position: 'right', top: '75%' },
          { position: 'top' },
          { position: 'top' },
          { position: 'top' }
        ];
      default:
        return [];
    }
  };

  const positions = getPositions(otherPlayers.length);

  const leftPlayers = otherPlayers.filter((_, idx) => positions[idx]?.position === 'left');
  const rightPlayers = otherPlayers.filter((_, idx) => positions[idx]?.position === 'right');

  return (
    <>
      {/* Bottom property stack for current player */}
      <div style={{
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(calc(-50% + 50px))',
        height: '280px',
        display: 'flex',
        alignItems: 'flex-start',
        overflow: 'visible',
        marginTop: '-3px',
        width: '800px',
        justifyContent: 'center'
      }}>
        {ownedProperties.map((property, index) => {
          const isLastProperty = index === ownedProperties.length - 1;
          const isExpanded = isLastProperty || expandedIndex === index;
          const basePosition = index * 56;
          let expandedOffset = 0;
          
          if (expandedIndex !== null && index > expandedIndex) {
            expandedOffset = 154;
          }

          const finalPosition = basePosition + expandedOffset;
          
          const multiplier = (() => {
            const ownedProperties = tiles.filter(tile => player?.properties?.includes(tile.id));
            const divisionProperties = ownedProperties.filter(tile => tile.division === property.division);
            const count = divisionProperties.length;

            if (property.division === 'tech') {
              if (count >= 6) return 5;
              if (count >= 5) return 4;
              
              const hasGoogle = player.properties.includes(37);
              const hasApple = player.properties.includes(36);
              const hasAmazon = player.properties.includes(41);
              
              if (hasGoogle && hasApple && hasAmazon) return 3;
              
              
              const bigTechCount = [hasGoogle, hasApple, hasAmazon].filter(Boolean).length;
              if (bigTechCount >= 2) return 2;
              
              if (count >= 3) return 2;
              return 1;
            } else {
              if (count >= 6) return 5;
              if (count >= 5) return 3;
              if (count >= 3) return 2;
              return 1;
            }
          })();

          const handleSell = (e) => {
            e.stopPropagation(); 
            if (window.confirm(`Are you sure you want to sell ${property.name} for $${property.cost}?`)) {
              socket.emit('updateProperty', {
                playerId: player.socketId,
                propertyId: property.id,
                action: 'remove',
                refundAmount: property.cost
              });
            }
          };
          
          return (
            <div
              key={property.id}
              onClick={() => !isLastProperty && handlePropertyClick(index)}
              style={{
                width: '210px',
                height: '280px',
                border: '2px solid #666',
                borderRadius: '12px',
                position: 'absolute',
                left: finalPosition,
                transition: 'all 0.3s ease',
                zIndex: isExpanded ? ownedProperties.length : index,
                display: 'flex',
                flexDirection: 'column',
                padding: '5px',
                boxSizing: 'border-box',
                backgroundColor: 'rgb(200, 240, 264)',
                cursor: isLastProperty ? 'default' : 'pointer',
                boxShadow: 'rgba(30, 30, 30, 0.5) 0px 2px 8px'
              }}
            >
              <div style={{
                transform: 'rotate(-90deg)',
                transformOrigin: 'left center',
                position: 'absolute',
                width: '280px',
                height: '210px',
                top: '140px',
                left: '105px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                color: '#333',
                fontSize: '1.68rem',
                fontWeight: 'bold',
                padding: '2px'
              }}>
                <div style={{
                  fontSize: '1.96rem',
                  marginBottom: '1px',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '252px',
                  width: '100%'
                }}>
                  {property.name}
                </div>
                <div style={{
                  fontSize: '1.4rem',
                  textAlign: 'left',
                  marginBottom: '12px'
                }}>
                  Cost: ${property.cost}
                </div>
                <div style={{
                  fontSize: '1.4rem',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  Rent: ${property.rent}
                  {multiplier > 1 && (
                    <span style={{ 
                      color: '#FFA500', 
                      fontSize: '1.3em', 
                      fontWeight: 'bold'
                    }}>
                      X{multiplier}
                    </span>
                  )}
                </div>
                <div style={{
                  width: '100%',
                  textAlign: 'left'
                }}>
                  <button
                    onClick={handleSell}
                    style={{
                      backgroundColor: '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      fontWeight: 'bold'
                    }}
                  >
                    Sell
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Left side property stacks */}
      {leftPlayers.map((leftPlayer, idx) => (
        <PropertyDisplayLeft 
          key={leftPlayer.socketId} 
          player={leftPlayer}
          position={idx === 0 ? 'top' : 'bottom'}
        />
      ))}

      {/* Right side property stacks */}
      {rightPlayers.map((rightPlayer, idx) => (
        <PropertyDisplayRight
          key={rightPlayer.socketId}
          player={rightPlayer}
          position={idx === 0 ? 'top' : 'bottom'}
        />
      ))}
    </>
  );
};

export default PropertyDisplay;