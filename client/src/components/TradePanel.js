import React, { useState, useContext, useEffect } from 'react';
import { GameContext } from '../context/GameContext';
import { tiles } from '../data/tiles';

const TradePanel = () => {
  const { 
    socket, 
    player, 
    players, 
    activeLoans, 
    loanRequests, 
    fetchLoans,
    requestLoan,
    respondToLoan,
    repayLoan,
    setPlayer, 
    setPlayers 
  } = useContext(GameContext);
  
  const [offerMoney, setOfferMoney] = useState(0);
  const [selectedOfferProperties, setSelectedOfferProperties] = useState([]);
  const [isOfferExpanded, setIsOfferExpanded] = useState(false);
  const [isOfferPropertiesExpanded, setIsOfferPropertiesExpanded] = useState(false);
  const [offerReady, setOfferReady] = useState(false);
  
  const [askMoney, setAskMoney] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedAskProperties, setSelectedAskProperties] = useState([]);
  const [isAskExpanded, setIsAskExpanded] = useState(false);
  const [isAskPropertiesExpanded, setIsAskPropertiesExpanded] = useState(false);
  const [askReady, setAskReady] = useState(false);

  const [incomingOffers, setIncomingOffers] = useState([]);

  const [offerBtnPressed, setOfferBtnPressed] = useState(false);
  const [askBtnPressed, setAskBtnPressed] = useState(false);
  const [requestTradeBtnPressed, setRequestTradeBtnPressed] = useState(false);
  const [offerPropertiesBtnPressed, setOfferPropertiesBtnPressed] = useState(false);
  const [askPropertiesBtnPressed, setAskPropertiesBtnPressed] = useState(false);

  // Local UI state
  const [loanAmount, setLoanAmount] = useState(0);
  const [returnAmount, setReturnAmount] = useState(0);
  const [selectedLender, setSelectedLender] = useState(null);
  const [activeTab, setActiveTab] = useState('request'); // 'request' or 'active'
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  React.useEffect(() => {
    if (!socket) return;

    socket.emit('getActiveTradeOffers');

    socket.on('tradeRequest', (offer) => {
      setIncomingOffers(prev => {
        if (prev.some(o => o.id === offer.id)) return prev;
        return [...prev, offer];
      });
    });

    socket.on('tradeAccepted', ({ offerId }) => {
      setIncomingOffers(prev => prev.filter(offer => offer.id !== offerId));
    });

    socket.on('tradeRejected', ({ offerId, reason, message, keepOffer }) => {
      if (!keepOffer) {
        setIncomingOffers(prev => prev.filter(offer => offer.id !== offerId));
      }
      if (message) {
        alert(message);
      }
    });

    socket.on('activeTradeOffers', (offers) => {
      setIncomingOffers(offers.filter(offer =>
        offer.to === player.socketId 
      ));
    });

    return () => {
      socket.off('tradeRequest');
      socket.off('tradeAccepted');
      socket.off('tradeRejected');
      socket.off('activeTradeOffers');
    };
  }, [socket, player.socketId]);

  React.useEffect(() => {
    setOfferReady(offerMoney >= 500 || selectedOfferProperties.length > 0);
  }, [offerMoney, selectedOfferProperties]);

  React.useEffect(() => {
    setAskReady(askMoney >= 500 || selectedAskProperties.length > 0);
  }, [askMoney, selectedAskProperties]);

  // Fetch loans when the panel is opened and when socket changes
  useEffect(() => {
    if (socket) {
      console.log('Fetching loans...');
      fetchLoans();
    }
    
    // Set up a listener for when the panel becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socket) {
        console.log('Panel became visible, refreshing loans...');
        fetchLoans();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socket, fetchLoans]);

  const handleMoneyChange = (section, amount) => {
    if (section === 'offer') {
      const newAmount = Math.max(0, Math.min(offerMoney + amount, player.money));
      setOfferMoney(newAmount);
    } else {
      const newAmount = Math.max(0, askMoney + amount);
      setAskMoney(newAmount);
    }
  };

  // Personal Loan Handlers
  const handleRequestLoan = () => {
    console.log('handleRequestLoan called with:', { selectedLender, loanAmount, returnAmount });
    if (!selectedLender || loanAmount <= 0 || returnAmount <= loanAmount) {
      console.log('Validation failed - missing lender or invalid amounts');
      return;
    }
    
    console.log('Requesting loan via context');
    requestLoan(selectedLender.socketId, loanAmount, returnAmount);
    
    // Reset form
    setLoanAmount(0);
    setReturnAmount(0);
    setSelectedLender(null);
  };

  const handleAcceptLoan = (loanId) => {
    console.log('Accepting loan:', loanId);
    respondToLoan(loanId, true);
  };

  const handleRejectLoan = (loanId) => {
    console.log('Rejecting loan:', loanId);
    respondToLoan(loanId, false);
  };

  const handleRepayLoan = (loanId) => {
    console.log('Repaying loan:', loanId);
    repayLoan(loanId);
  };

  const handleClaimLoan = (loanId) => {
    console.log('Claiming loan:', loanId);
    // This would be for the lender to claim the loan if it's not repaid on time
    // Implementation would depend on your game's rules
    socket.emit('claimLoan', { loanId });
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
    setSelectedAskProperties([]); 
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
      id: Date.now()
    };

    socket.emit('tradeRequest', tradeRequest);
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
                  fontSize: '1.1em'
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
                  fontSize: '1.1em'
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
                  fontSize: '1.1em'
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
                  fontSize: '1.1em'
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
                  fontSize: '1.3em',
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

      {/* Personal Loans Section */}
      <div style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '10px',
        padding: '20px',
        marginTop: '20px',
        fontSize: '1.2em' // Base font size for the loan section
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '20px',
          borderBottom: '2px solid #555',
          paddingBottom: '12px'
        }}>
          <button 
            onClick={() => setActiveTab('request')}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: activeTab === 'request' ? '#4CAF50' : '#2E7D32',
              border: 'none',
              borderRadius: '5px 0 0 5px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1.4em'
            }}
          >
            Request Loan
          </button>
          <button 
            onClick={() => setActiveTab('active')}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: activeTab === 'active' ? '#2196F3' : '#1565C0',
              border: 'none',
              borderRadius: '0 5px 5px 0',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1.4em'
            }}
          >
            My Loans ({activeLoans.length})
          </button>
        </div>

        {activeTab === 'request' ? (
          <div>
            {/* Request Loan Form */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: 'white' }}>
                  Select Player to Request From:
                </label>
                <select 
                  value={selectedLender?.socketId || ''}
                  onChange={(e) => {
                    const lender = players.find(p => p.socketId === e.target.value);
                    setSelectedLender(lender);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '5px',
                    fontSize: '1.3em'
                  }}
                >
                  <option value="">Select a player</option>
                  {players
                    .filter(p => p.socketId !== player.socketId)
                    .map(p => (
                      <option key={p.socketId} value={p.socketId}>
                        {p.name} (${p.money})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', color: 'white', fontSize: '1.2em' }}>
                  Loan Amount:
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0px',
                  marginBottom: '10px',
                  justifyContent: 'center'
                }}>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setLoanAmount(prev => Math.max(0, prev - 500));
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '1.7em',
                      cursor: 'pointer',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      borderRadius: '4px',
                      border: '2px inset rgb(80, 80, 170)',
                      minWidth: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    -
                  </button>

                  <input
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    onFocus={(e) => e.target.select()}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '1.7em',
                      border: '2px inset rgb(80, 80, 170)',
                      minHeight: '50px',
                      color: 'white',
                      outline: 'none',
                      WebkitAppearance: 'textfield',
                      MozAppearance: 'textfield',
                      appearance: 'textfield',
                      maxWidth: '200px'
                    }}
                    min="0"
                    step="100"
                  />

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setLoanAmount(prev => prev + 500);
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '1.7em',
                      cursor: 'pointer',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      borderRadius: '4px',
                      border: '2px inset rgb(80, 80, 170)',
                      minWidth: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', color: 'white', fontSize: '1.2em' }}>
                  Return Amount (must be more than loan amount):
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0px',
                  marginBottom: '10px',
                  justifyContent: 'center'
                }}>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setReturnAmount(prev => Math.max(loanAmount + 1, parseInt(prev || 0) - 500));
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '1.7em',
                      cursor: 'pointer',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      borderRadius: '4px',
                      border: '2px inset rgb(80, 80, 170)',
                      minWidth: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    -
                  </button>

                  <input
                    type="number"
                    value={returnAmount}
                    onChange={(e) => setReturnAmount(Math.max(loanAmount + 1, parseInt(e.target.value) || loanAmount + 1))}
                    onFocus={(e) => e.target.select()}
                    min={loanAmount + 500}
                    step="100"
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '1.7em',
                      border: `2px inset ${returnAmount > loanAmount ? 'rgb(80, 80, 170)' : '#FF5252'}`,
                      minHeight: '50px',
                      color: returnAmount > loanAmount ? 'white' : '#FF5252',
                      outline: 'none',
                      WebkitAppearance: 'textfield',
                      MozAppearance: 'textfield',
                      appearance: 'textfield',
                      maxWidth: '200px',
                      fontWeight: 'bold'
                    }}
                  />

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setReturnAmount(prev => parseInt(prev || loanAmount + 1) + 500);
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '1.7em',
                      cursor: 'pointer',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      borderRadius: '4px',
                      border: '2px inset rgb(80, 80, 170)',
                      minWidth: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    +
                  </button>
                </div>
                {returnAmount <= loanAmount && (
                  <div style={{ 
                    color: '#FF5252', 
                    marginTop: '5px', 
                    fontSize: '1em',
                    textAlign: 'center',
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                    padding: '5px',
                    borderRadius: '4px'
                  }}>
                    Return amount must be greater than loan amount
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <button
                  onClick={handleRequestLoan}
                  disabled={!selectedLender || loanAmount <= 0 || returnAmount <= loanAmount}
                  style={{
                    width: '90%',
                    padding: '10px',
                    backgroundColor: returnAmount > loanAmount ? '#4CAF50' : '#888',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: returnAmount > loanAmount ? 'pointer' : 'not-allowed',
                    fontSize: '1.4em'
                  }}
                >
                  Request ${loanAmount} (Pay back ${returnAmount})
                </button>
              </div>
            </div>

            {/* Loan Requests */}
            {loanRequests.length > 0 && (
              <div>
                <h3 style={{ color: 'white', borderBottom: '1px solid #444', paddingBottom: '5px' }}>
                  Pending Requests
                </h3>
                {loanRequests.map(request => {
                  // Handle both old and new request formats
                  const requestData = request.loan || request;
                  const fromName = requestData.from?.name || requestData.borrowerName || 'Unknown';
                  const amount = requestData.amount || 0;
                  const returnAmount = requestData.returnAmount || 0;
                  
                  return (
                    <div key={requestData.id} style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      padding: '15px',
                      borderRadius: '8px',
                      marginBottom: '15px',
                      color: 'white',
                      borderLeft: '4px solid #4CAF50'
                    }}>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold', color: '#4CAF50' }}>Loan Request</span>
                      </div>
                      <div style={{ marginBottom: '5px' }}>
                        <span style={{ opacity: 0.8 }}>From:</span>{' '}
                        <span style={{ fontWeight: 'bold' }}>{fromName}</span>
                      </div>
                      <div style={{ marginBottom: '5px' }}>
                        <span style={{ opacity: 0.8 }}>Amount:</span>{' '}
                        <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>${amount.toLocaleString()}</span>
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <span style={{ opacity: 0.8 }}>To Return:</span>{' '}
                        <span style={{ color: '#FF9800', fontWeight: 'bold' }}>${returnAmount.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                          onClick={() => handleAcceptLoan(requestData.id)}
                          disabled={player.money < amount}
                          style={{
                            flex: 1,
                            padding: '8px',
                            backgroundColor: player.money >= amount ? '#4CAF50' : '#888',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: player.money >= amount ? 'pointer' : 'not-allowed',
                            fontSize: '1.2em',
                            transition: 'all 0.2s'
                          }}
                        >
                          Lend ${amount.toLocaleString()}
                        </button>
                        <button
                          onClick={() => handleRejectLoan(requestData.id)}
                          style={{
                            flex: 1,
                            padding: '8px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '1.2em',
                            transition: 'all 0.2s'
                          }}
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
        ) : (
          /* Active Loans Tab */
          <div>
            {activeLoans.length === 0 ? (
              <div style={{ color: 'white', textAlign: 'center', padding: '20px' }}>
                No active loans
              </div>
            ) : (
              activeLoans.map(loan => (
                <div key={loan.id} style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  padding: '15px',
                  borderRadius: '5px',
                  marginBottom: '15px',
                  color: 'white'
                }}>
                  <div style={{ marginBottom: '10px' }}>
                    <div><strong>Amount:</strong> ${loan.amount}</div>
                    <div><strong>To Return:</strong> ${loan.returnAmount}</div>
                    <div><strong>Status:</strong> {loan.status}</div>
                    <div><strong>With:</strong> {loan.lenderId === player.socketId ? loan.borrowerName : loan.lenderName}</div>
                  </div>
                  
                  {loan.status === 'active' && (
                    <div>
                      {loan.borrowerId === player.socketId ? (
                        <button
                          onClick={() => handleRepayLoan(loan.id)}
                          disabled={player.money < loan.returnAmount}
                          style={{
                            width: '100%',
                            padding: '8px',
                            backgroundColor: player.money >= loan.returnAmount ? '#4CAF50' : '#888',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: player.money >= loan.returnAmount ? 'pointer' : 'not-allowed',
                            fontSize: '1.3em'
                          }}
                        >
                          Repay ${loan.returnAmount}
                        </button>
                      ) : (
                        <div style={{ color: '#4CAF50' }}>
                          Waiting for {loan.borrowerName} to repay
                        </div>
                      )}
                    </div>
                  )}
                  
                  {loan.status === 'pending_payment' && loan.lenderId === player.socketId && (
                    <button
                      onClick={() => handleClaimLoan(loan.id)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '1.3em'
                      }}
                    >
                      Claim ${loan.returnAmount} from {loan.borrowerName}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TradePanel;