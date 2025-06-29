import React, { useState, useContext } from 'react';
import { tiles } from '../data/tiles';
import { GameContext } from '../context/GameContext';

const TopPropertyDisplay = () => {
  const [expandedStates, setExpandedStates] = useState({});
  const { players, player: currentPlayer, socket } = useContext(GameContext);

  // Get all players except the current player
  const otherPlayers = players.filter(p => p.socketId !== currentPlayer?.socketId);
  
  // Get positions based on number of players (matching PropertyDisplay logic)
  const getPositions = (numPlayers) => {
    switch(numPlayers) {
      case 3: return [{ left: '50%' }];  // 1 player on top
      case 4: return [{ left: '-30%' }, { left: '70%' }];  // 2 players on top
      case 5: return [{ left: '50%' }];  // 1 player on top
      case 6: return [{ left: '-30%' }, { left: '70%' }];  // 2 players on top
      case 7: return [{ left: '-33%' }, { left: '33%' }, { left: '66%' }];  // 3 players on top
      default: return [];
    }
  };

  // Get only the players that should appear at the top (matching PropertyDisplay logic)
  const getTopPlayers = (players, totalPlayers) => {
    switch(totalPlayers) {
      case 3: return players.slice(2, 3);  // Last 1 player
      case 4: return players.slice(2, 4);  // Last 2 players
      case 5: return players.slice(4, 5);  // Last 1 player
      case 6: return players.slice(4, 6);  // Last 2 players
      case 7: return players.slice(4, 7);  // Last 3 players
      default: return [];
    }
  };

  const handlePropertyClick = (playerId, propertyIndex) => {
    setExpandedStates(prev => ({
      ...prev,
      [playerId]: prev[playerId] === propertyIndex ? null : propertyIndex
    }));
  };

  // Calculate rent multiplier based on owned properties
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
      
      // Check for any 2 of Google, Apple, Amazon
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
    e.stopPropagation(); // Prevent card expansion when clicking sell button
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

  // Reduced dimensions (70% of original)
  const cardWidth = 147; // 70% of 210
  const cardHeight = 196; // 70% of 280
  const cardOverlap = 39; // 70% of 56
  const expandOffset = 108; // 70% of 154
  const stackWidth = cardWidth + (cardOverlap * 4);

  return (
    <div style={{
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
        // Get player's properties and sort by division
        const ownedProperties = tiles
          .filter(tile => tile.type === 'property')
          .filter(tile => player?.properties?.includes(tile.id))
          .sort((a, b) => {
            if (a.division === b.division) {
              return a.name.localeCompare(b.name); // Sort by name within same division
            }
            return a.division.localeCompare(b.division); // Sort by division
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
            {/* Player name label */}
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
              
              // Calculate base position (never changes)
              const basePosition = index * cardOverlap;
              
              // Calculate additional offset based on expanded state
              let expandedOffset = 0;
              
              if (playerExpandedIndex !== null && playerExpandedIndex !== undefined) {
                // If there's an expanded card
                if (index > playerExpandedIndex) {
                  expandedOffset = expandOffset;
                }
              }

              // Calculate final position
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