import React, { useState, useContext } from 'react';
import { tiles } from '../data/tiles';
import { GameContext } from '../context/GameContext';

const TopPropertyDisplay = () => {
  const [expandedStates, setExpandedStates] = useState({});
  const { players, player: currentPlayer, socket } = useContext(GameContext);

  const otherPlayers = players.filter(p => p.socketId !== currentPlayer?.socketId);
  
  const getPositions = (numPlayers) => {
    switch(numPlayers) {
      case 3: return [{ left: '50%' }]; 
      case 4: return [{ left: '-30%' }, { left: '70%' }]; 
      case 5: return [{ left: '50%' }]; 
      case 6: return [{ left: '-30%' }, { left: '70%' }]; 
      case 7: return [{ left: '-33%' }, { left: '33%' }, { left: '66%' }]; 
      default: return [];
    }
  };

  const getTopPlayers = (players, totalPlayers) => {
    switch(totalPlayers) {
      case 3: return players.slice(2, 3); 
      case 4: return players.slice(2, 4); 
      case 5: return players.slice(4, 5); 
      case 6: return players.slice(4, 6); 
      case 7: return players.slice(4, 7); 
      default: return [];
    }
  };

  const handlePropertyClick = (playerId, propertyIndex) => {
    setExpandedStates(prev => ({
      ...prev,
      [playerId]: prev[playerId] === propertyIndex ? null : propertyIndex
    }));
  };

  const getRentMultiplier = (player, property) => {
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

  const handleSell = (e, player, property) => {
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

  const topPlayers = getTopPlayers(otherPlayers, otherPlayers.length);
  const positions = getPositions(otherPlayers.length);

  const cardWidth = 147; 
  const cardHeight = 196; 
  const cardOverlap = 39; 
  const expandOffset = 108; 
  const stackWidth = cardWidth + (cardOverlap * 4);

  return (
    (!topPlayers || topPlayers.length === 0)
      ? null
      : <div style={{
          position: 'absolute',
          top: '-190px',
          left: '50%',
          transform: 'translateX(-50%)',
          height: cardHeight + 'px',
          display: 'flex',
          alignItems: 'flex-start',
          overflow: 'visible',
          width: '1000px',
          justifyContent: 'space-around',
          zIndex: 1
        }}>
        {topPlayers.map((player, playerIndex) => {
          const ownedProperties = tiles
            .filter(tile => tile.type === 'property')
            .filter(tile => player?.properties?.includes(tile.id))
            .sort((a, b) => {
              if (a.division === b.division) {
                return a.name.localeCompare(b.name);
              }
              return a.division.localeCompare(b.division);
            });

          const position = positions[playerIndex];
          const playerExpandedIndex = expandedStates[player.socketId];

          return (
            <div key={player.socketId} style={{
              position: 'absolute',
              left: position.left,
              transform: 'translateX(-50%)',
              width: stackWidth + 'px',
              height: '100%',
              display: 'flex',
              alignItems: 'flex-start'
            }}>
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                zIndex: 4,
                marginTop: '4px'
              }}>
                {player.name}
              </div>

              {ownedProperties.map((property, index) => {
                const isLastProperty = index === ownedProperties.length - 1;
                const isExpanded = isLastProperty || playerExpandedIndex === index;
                const multiplier = getRentMultiplier(player, property);
                
                const basePosition = index * cardOverlap;
                
                let expandedOffset = 0;
                
                if (playerExpandedIndex !== null && playerExpandedIndex !== undefined) {
                  if (index > playerExpandedIndex) {
                    expandedOffset = expandOffset;
                  }
                }

                const finalPosition = basePosition + expandedOffset;
                
                return (
                  <div
                    key={property.id}
                    onClick={() => !isLastProperty && handlePropertyClick(player.socketId, index)}
                    style={{
                      width: cardWidth + 'px',
                      height: cardHeight + 'px',
                      border: '2px solid #666',
                      borderRadius: '8px',
                      position: 'absolute',
                      left: finalPosition,
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
                    <div style={{
                      transform: 'rotate(-90deg)',
                      transformOrigin: 'left center',
                      position: 'absolute',
                      width: cardHeight + 'px',
                      height: cardWidth + 'px',
                      top: cardHeight / 2 + 'px',
                      left: cardWidth / 2 + 'px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-start',
                      color: '#333',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      padding: '10px'
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
                      {player.socketId === currentPlayer?.socketId && (
                        <div style={{
                          width: '100%',
                          textAlign: 'left'
                        }}>
                          <button
                            onClick={(e) => handleSell(e, player, property)}
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
                  </div>
                );
              })}
            </div>
          );
        })}
        </div>
  );
};

export default TopPropertyDisplay;