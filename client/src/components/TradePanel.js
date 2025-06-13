import React, { useState, useContext } from 'react';
import { GameContext } from '../context/GameContext';
import { tiles } from '../data/tiles';

const TradePanel = () => {
  const { socket, player, players } = useContext(GameContext);
  
  // Offer section state
  const [offerMoney, setOfferMoney] = useState(0);
  const [selectedOfferProperties, setSelectedOfferProperties] = useState([]);
  const [isOfferExpanded, setIsOfferExpanded] = useState(false);
  const [isOfferPropertiesExpanded, setIsOfferPropertiesExpanded] = useState(false);
  const [offerReady, setOfferReady] = useState(false);
  
  // Ask section state
  const [askMoney, setAskMoney] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedAskProperties, setSelectedAskProperties] = useState([]);
  const [isAskExpanded, setIsAskExpanded] = useState(false);
  const [isAskPropertiesExpanded, setIsAskPropertiesExpanded] = useState(false);
  const [askReady, setAskReady] = useState(false);

  // Incoming offers state
  const [incomingOffers, setIncomingOffers] = useState([]);

  // Effect to listen for trade requests
  React.useEffect(() => {
    if (!socket) return;

    socket.on('tradeRequest', (offer) => {
      setIncomingOffers(prev => [...prev, offer]);
    });

    socket.on('tradeAccepted', ({ offerId }) => {
      setIncomingOffers(prev => prev.filter(offer => offer.id !== offerId));
      // Refresh player data will be handled by GameContext
    });

    socket.on('tradeRejected', ({ offerId, reason, message, keepOffer }) => {
      if (!keepOffer) {
        setIncomingOffers(prev => prev.filter(offer => offer.id !== offerId));
      }
      // Only show alert if there's a message
      if (message) {
        alert(message);
      }
    });

    return () => {
      socket.off('tradeRequest');
      socket.off('tradeAccepted');
      socket.off('tradeRejected');
    };
  }, [socket]);

  // Update ready states
  React.useEffect(() => {
    setOfferReady(offerMoney >= 500 || selectedOfferProperties.length > 0);
  }, [offerMoney, selectedOfferProperties]);

  React.useEffect(() => {
    setAskReady(askMoney >= 500 || selectedAskProperties.length > 0);
  }, [askMoney, selectedAskProperties]);

  const handleMoneyChange = (section, amount) => {
    if (section === 'offer') {
      const newAmount = Math.max(0, Math.min(offerMoney + amount, player.money));
      setOfferMoney(newAmount);
    } else {
      const newAmount = Math.max(0, askMoney + amount);
      setAskMoney(newAmount);
    }
  };

  const handlePropertyToggle = (section, propertyId) => {
    if (section === 'offer') {
      setSelectedOfferProperties(prev => 
        prev.includes(propertyId) 
          ? prev.filter(id => id !== propertyId)
          : [...prev, propertyId]
      );
    } else {
      setSelectedAskProperties(prev => 
        prev.includes(propertyId) 
          ? prev.filter(id => id !== propertyId)
          : [...prev, propertyId]
      );
    }
  };

  const handlePlayerSelect = (playerId) => {
    setSelectedPlayer(playerId);
    setSelectedAskProperties([]); // Reset selected properties when player changes
    setIsAskPropertiesExpanded(false);
  };

  const handleTradeRequest = () => {
    if (!offerReady || !askReady || !selectedPlayer) return;

    const tradeRequest = {
      from: player.socketId,
      to: selectedPlayer,
      offer: {
        money: offerMoney,
        properties: selectedOfferProperties
      },
      ask: {
        money: askMoney,
        properties: selectedAskProperties
      },
      id: Date.now() // Simple unique ID
    };

    socket.emit('tradeRequest', tradeRequest);

    // Reset form
    setOfferMoney(0);
    setSelectedOfferProperties([]);
    setAskMoney(0);
    setSelectedAskProperties([]);
    setSelectedPlayer(null);
    setIsOfferPropertiesExpanded(false);
    setIsAskPropertiesExpanded(false);
  };

  const handleTradeResponse = (offerId, accepted) => {
    socket.emit('tradeResponse', { offerId, accepted });
  };

  return (
    <div className="trade-panel" style={{
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* Offer Section */}
      <div style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '10px',
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <button 
          onClick={() => setIsOfferExpanded(!isOfferExpanded)}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'rgb(175, 76, 80)',
            border: 'none',
            borderRadius: '5px',
            color: 'white',
            marginBottom: '10px',
            cursor: 'pointer',
            fontSize: '1.2em'
          }}
        >
          Offer
        </button>
        
        {isOfferExpanded && (
          <div style={{ 
            marginBottom: '10px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px'
          }}>
            {/* Money Input */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '10px',
              borderRadius: '5px'
            }}>
              <button 
                onClick={() => handleMoneyChange('offer', -500)}
                style={{
                  padding: '5px 15px',
                  backgroundColor: '#f44336',
                  border: 'none',
                  borderRadius: '5px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1.2em'
                }}
              >-</button>
              <span style={{ margin: '0 15px', fontSize: '1.2em' }}>${offerMoney}</span>
              <button 
                onClick={() => handleMoneyChange('offer', 500)}
                style={{
                  padding: '5px 15px',
                  backgroundColor: '#4CAF50',
                  border: 'none',
                  borderRadius: '5px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1.2em'
                }}
              >+</button>
            </div>

            {/* Properties Selection */}
            <button 
              onClick={() => setIsOfferPropertiesExpanded(!isOfferPropertiesExpanded)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#2196F3',
                border: 'none',
                borderRadius: '5px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1.1em'
              }}
            >
              Properties
            </button>
            {isOfferPropertiesExpanded && (
              <div style={{ 
                marginTop: '10px',
                width: '100%'
              }}>
                {player.properties.map(propId => {
                  const property = tiles.find(t => t.id === propId);
                  return (
                    <div key={propId} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px',
                      marginBottom: '5px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '5px',
                      minHeight: '40px'
                    }}>
                      <span style={{ fontSize: '1.1em' }}>{property.name}</span>
                      <input
                        type="checkbox"
                        checked={selectedOfferProperties.includes(propId)}
                        onChange={() => handlePropertyToggle('offer', propId)}
                        style={{
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ask Section */}
      <div style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '10px',
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <button 
          onClick={() => setIsAskExpanded(!isAskExpanded)}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'rgb(103, 213, 132)',
            border: 'none',
            borderRadius: '5px',
            color: 'white',
            marginBottom: '10px',
            cursor: 'pointer',
            fontSize: '1.2em'
          }}
        >
          Ask
        </button>
        
        {isAskExpanded && (
          <div style={{ 
            marginBottom: '10px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px'
          }}>
            {/* Money Input */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '10px',
              borderRadius: '5px'
            }}>
              <button 
                onClick={() => handleMoneyChange('ask', -500)}
                style={{
                  padding: '5px 15px',
                  backgroundColor: '#f44336',
                  border: 'none',
                  borderRadius: '5px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1.2em'
                }}
              >-</button>
              <span style={{ margin: '0 15px', fontSize: '1.2em' }}>${askMoney}</span>
              <button 
                onClick={() => handleMoneyChange('ask', 500)}
                style={{
                  padding: '5px 15px',
                  backgroundColor: '#4CAF50',
                  border: 'none',
                  borderRadius: '5px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1.2em'
                }}
              >+</button>
            </div>

            {/* Player Selection */}
            <div style={{ 
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '10px',
              borderRadius: '5px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <select 
                value={selectedPlayer || ''} 
                onChange={(e) => handlePlayerSelect(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '1.1em',
                  textAlign: 'center'
                }}
              >
                <option value="">Select Player</option>
                {players
                  .filter(p => p.socketId !== player.socketId)
                  .map(p => (
                    <option key={p.socketId} value={p.socketId}>
                      {p.name}
                    </option>
                  ))
                }
              </select>
            </div>

            {/* Properties Selection */}
            {selectedPlayer && (
              <div style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <button 
                  onClick={() => setIsAskPropertiesExpanded(!isAskPropertiesExpanded)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#2196F3',
                    border: 'none',
                    borderRadius: '5px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1.1em'
                  }}
                >
                  Properties
                </button>
                {isAskPropertiesExpanded && (
                  <div style={{ 
                    marginTop: '10px',
                    width: '100%'
                  }}>
                    {players
                      .find(p => p.socketId === selectedPlayer)
                      ?.properties.map(propId => {
                        const property = tiles.find(t => t.id === propId);
                        return (
                          <div key={propId} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px',
                            marginBottom: '5px',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '5px',
                            minHeight: '40px'
                          }}>
                            <span style={{ fontSize: '1.1em' }}>{property.name}</span>
                            <input
                              type="checkbox"
                              checked={selectedAskProperties.includes(propId)}
                              onChange={() => handlePropertyToggle('ask', propId)}
                              style={{
                                width: '20px',
                                height: '20px',
                                cursor: 'pointer'
                              }}
                            />
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trade Request Button Section */}
      <div style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '10px',
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%'
      }}>
        <button
          onClick={handleTradeRequest}
          disabled={!offerReady || !askReady || !selectedPlayer}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: offerReady && askReady && selectedPlayer ? '#4CAF50' : '#666',
            border: 'none',
            borderRadius: '5px',
            color: 'white',
            fontSize: '1.2em',
            cursor: offerReady && askReady && selectedPlayer ? 'pointer' : 'not-allowed'
          }}
        >
          Request Trade
        </button>
      </div>

      {/* Incoming Offers Section */}
      {incomingOffers.length > 0 && (
        <div style={{ 
          marginTop: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '10px',
          padding: '15px'
        }}>
          <h3 style={{ 
            color: 'white', 
            marginTop: 0,
            marginBottom: '15px'
          }}>Incoming Offers:</h3>
          {incomingOffers.map(offer => {
            const fromPlayer = players.find(p => p.socketId === offer.from);
            return (
              <div key={offer.id} style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '10px',
                marginBottom: '10px',
                borderRadius: '5px'
              }}>
                <p>From: {fromPlayer?.name}</p>
                <p>Offers: ${offer.offer.money}</p>
                <p>Properties Offered: {offer.offer.properties.map(propId => 
                  tiles.find(t => t.id === propId)?.name
                ).join(', ')}</p>
                <p>Asks: ${offer.ask.money}</p>
                <p>Properties Asked: {offer.ask.properties.map(propId => 
                  tiles.find(t => t.id === propId)?.name
                ).join(', ')}</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button 
                    onClick={() => handleTradeResponse(offer.id, true)}
                    style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '5px 10px' }}
                  >
                    Accept
                  </button>
                  <button 
                    onClick={() => handleTradeResponse(offer.id, false)}
                    style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '5px 10px' }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TradePanel; 