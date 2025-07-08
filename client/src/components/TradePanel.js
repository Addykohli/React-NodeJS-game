import React, { useState, useContext, useEffect } from 'react';
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

  // Add pressed state for offer, ask, request trade, and both properties buttons
  const [offerBtnPressed, setOfferBtnPressed] = useState(false);
  const [askBtnPressed, setAskBtnPressed] = useState(false);
  const [requestTradeBtnPressed, setRequestTradeBtnPressed] = useState(false);
  const [offerPropertiesBtnPressed, setOfferPropertiesBtnPressed] = useState(false);
  const [askPropertiesBtnPressed, setAskPropertiesBtnPressed] = useState(false);

  // Add a debug log for incomingOffers
  useEffect(() => {
    console.log('[TradePanel] incomingOffers changed:', incomingOffers);
  }, [incomingOffers]);

  // Effect to listen for trade requests and active offers
  useEffect(() => {
    if (!socket) return;

    // Listen for new trade requests
    const handleTradeRequest = (offer) => {
      setIncomingOffers(prev => {
        // Prevent duplicates
        if (prev.some(o => o.id === offer.id)) return prev;
        return [...prev, offer];
      });
      console.log('[TradePanel] Received tradeRequest:', offer);
    };

    const handleTradeAccepted = ({ offerId }) => {
      setIncomingOffers(prev => prev.filter(offer => offer.id !== offerId));
      console.log('[TradePanel] Trade accepted, removed offer:', offerId);
    };

    const handleTradeRejected = ({ offerId, reason, message, keepOffer }) => {
      if (!keepOffer) {
        setIncomingOffers(prev => prev.filter(offer => offer.id !== offerId));
        console.log('[TradePanel] Trade rejected, removed offer:', offerId);
      }
      if (message) {
        alert(message);
      }
    };

    // Listen for full active offers list from server
    const handleActiveTradeOffers = (offers) => {
      // Only show offers for this player
      const filtered = offers.filter(offer => offer.to === player.socketId);
      setIncomingOffers(filtered);
      console.log('[TradePanel] Received activeTradeOffers:', filtered);
    };

    socket.on('tradeRequest', handleTradeRequest);
    socket.on('tradeAccepted', handleTradeAccepted);
    socket.on('tradeRejected', handleTradeRejected);
    socket.on('activeTradeOffers', handleActiveTradeOffers);

    // On mount, fetch all active offers
    socket.emit('getActiveTradeOffers');

    return () => {
      socket.off('tradeRequest', handleTradeRequest);
      socket.off('tradeAccepted', handleTradeAccepted);
      socket.off('tradeRejected', handleTradeRejected);
      socket.off('activeTradeOffers', handleActiveTradeOffers);
    };
  }, [socket, player.socketId]);

  // Always fetch active trade offers when the panel is mounted (not just when expanded)
  useEffect(() => {
    if (socket) {
      socket.emit('getActiveTradeOffers');
      console.log('[TradePanel] Fetching active trade offers on mount');
    }
  }, [socket, player.socketId]);

  // Remove this effect: it causes the offers to be cleared when toggling the panel
  // React.useEffect(() => {
  //   if (isOfferExpanded || isAskExpanded || requestTradeBtnPressed) {
  //     if (socket) {
  //       socket.emit('getActiveTradeOffers');
  //     }
  //   }
  // }, [isOfferExpanded, isAskExpanded, requestTradeBtnPressed, socket]);

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
      {/* Debug: Show incomingOffers count */}
      <div style={{ color: '#aaa', fontSize: '0.9em', marginBottom: '4px' }}>
        [debug] incomingOffers: {incomingOffers.length}
      </div>
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
          onClick={() => {
            setOfferBtnPressed(true);
            setTimeout(() => setOfferBtnPressed(false), 120);
            setIsOfferExpanded(!isOfferExpanded);
          }}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'rgb(175, 76, 80)',
            border: offerBtnPressed ? '4px inset rgb(90, 40, 40)' : '4px outset rgb(90, 40, 40)',
            borderRadius: '5px',
            color: 'white',
            marginBottom: '10px',
            cursor: 'pointer',
            fontSize: '1.8em'
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
                  fontSize: '1.6em'
                }}
              >-</button>

              <span style={{ margin: '0 15px', fontSize: '2em' }}>
                ${offerMoney}
              </span>

              <button 
                onClick={() => handleMoneyChange('offer', 500)}
                style={{
                  padding: '5px 15px',
                  backgroundColor: '#4CAF50',
                  border: 'none',
                  borderRadius: '5px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1.6em'
                }}
              >+</button>
            </div>

            {/* Properties Selection */}
            <button 
              onClick={() => {
                setOfferPropertiesBtnPressed(true);
                setTimeout(() => setOfferPropertiesBtnPressed(false), 120);
                setIsOfferPropertiesExpanded(!isOfferPropertiesExpanded);
              }}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#2196F3',
                border: offerPropertiesBtnPressed ? '4px inset rgb(40, 40, 90)' : '4px outset rgb(40, 40, 90)',
                borderRadius: '5px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1.3em'
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
                  const checked = selectedOfferProperties.includes(propId);
                  return (
                    <div
                      key={propId}
                      onClick={() => handlePropertyToggle('offer', propId)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px',
                        marginBottom: '5px',
                        backgroundColor: checked ? 'rgba(33, 150, 243, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '5px',
                        minHeight: '40px',
                        cursor: 'pointer',
                        border: checked ? '2px solid #2196F3' : '2px solid transparent',
                        transition: 'background 0.15s, border 0.15s'
                      }}
                    >
                      <span style={{ fontSize: '1.1em', userSelect: 'none' }}>{property.name}</span>
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          background: checked ? '#2196F3' : 'transparent',
                          border: '2px solid #2196F3',
                          transition: 'background 0.15s'
                        }}
                      >
                        {checked && (
                          <svg width="16" height="16" viewBox="0 0 16 16">
                            <polyline
                              points="3,8 7,12 13,4"
                              style={{
                                fill: 'none',
                                stroke: 'white',
                                strokeWidth: 2
                              }}
                            />
                          </svg>
                        )}
                      </span>
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
          onClick={() => {
            setAskBtnPressed(true);
            setTimeout(() => setAskBtnPressed(false), 120);
            setIsAskExpanded(!isAskExpanded);
          }}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'rgb(103, 213, 132)',
            border: askBtnPressed ? '4px inset rgb(40, 90, 40)' : '4px outset rgb(40, 90, 40)',
            borderRadius: '5px',
            color: 'white',
            marginBottom: '10px',
            cursor: 'pointer',
            fontSize: '1.8em'
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
                  fontSize: '1.6em'
                }}
              >-</button>
              <span style={{ margin: '0 15px', fontSize: '2em' }}>
                ${askMoney}
                </span>
              <button 
                onClick={() => handleMoneyChange('ask', 500)}
                style={{
                  padding: '5px 15px',
                  backgroundColor: '#4CAF50',
                  border: 'none',
                  borderRadius: '5px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1.6em'
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
                  onClick={() => {
                    setAskPropertiesBtnPressed(true);
                    setTimeout(() => setAskPropertiesBtnPressed(false), 120);
                    setIsAskPropertiesExpanded(!isAskPropertiesExpanded);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#2196F3',
                    border: askPropertiesBtnPressed ? '4px inset rgb(40, 40, 90)' : '4px outset rgb(40, 40, 90)',
                    borderRadius: '5px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1.3em'
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
                        const checked = selectedAskProperties.includes(propId);
                        return (
                          <div
                            key={propId}
                            onClick={() => handlePropertyToggle('ask', propId)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px',
                              marginBottom: '5px',
                              backgroundColor: checked ? 'rgba(33, 150, 243, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                              borderRadius: '5px',
                              minHeight: '40px',
                              cursor: 'pointer',
                              border: checked ? '2px solid #2196F3' : '2px solid transparent',
                              transition: 'background 0.15s, border 0.15s'
                            }}
                          >
                            <span style={{ fontSize: '1.1em', userSelect: 'none' }}>{property.name}</span>
                            <span
                              style={{
                                width: '22px',
                                height: '22px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px',
                                background: checked ? '#2196F3' : 'transparent',
                                border: '2px solid #2196F3',
                                transition: 'background 0.15s'
                              }}
                            >
                              {checked && (
                                <svg width="16" height="16" viewBox="0 0 16 16">
                                  <polyline
                                    points="3,8 7,12 13,4"
                                    style={{
                                      fill: 'none',
                                      stroke: 'white',
                                      strokeWidth: 2
                                    }}
                                  />
                                </svg>
                              )}
                            </span>
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
          onClick={() => {
            setRequestTradeBtnPressed(true);
            setTimeout(() => setRequestTradeBtnPressed(false), 120);
            handleTradeRequest();
          }}
          disabled={!offerReady || !askReady || !selectedPlayer}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: offerReady && askReady && selectedPlayer ? '#4CAF50' : '#666',
            border: requestTradeBtnPressed ? '4px inset rgb(40, 40, 40)' : '4px outset rgb(40, 40, 40)',
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
                <p>You get: ${offer.offer.money}</p>
                <p>Properties you get: {offer.offer.properties.map(propId => 
                  tiles.find(t => t.id === propId)?.name
                ).join(', ')}</p>
                <p>Asks: ${offer.ask.money}</p>
                <p>Properties you give: {offer.ask.properties.map(propId => 
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