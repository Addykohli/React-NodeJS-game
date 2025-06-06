import React, { useState, useEffect, useContext } from 'react';
import { GameContext } from '../context/GameContext';
import { tiles } from '../data/tiles';

const TradePanel = () => {
  const { socket, player, players } = useContext(GameContext);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [offerAmount, setOfferAmount] = useState(1000);
  const [incomingTrades, setIncomingTrades] = useState([]);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const handleTradeOffer = (offer) => {
      setIncomingTrades(prev => [...prev, offer]);
    };

    const handleTradeResponse = ({ offerId, accepted }) => {
      setIncomingTrades(prev => prev.filter(trade => trade.offerId !== offerId));
      // Also hide the panel if we were the one who made the offer
      if (accepted) {
        setShowPanel(false);
        setSelectedPlayer(null);
        setSelectedProperty(null);
        setOfferAmount(1000);
      }
    };

    socket.on('tradeOffer', handleTradeOffer);
    socket.on('tradeResponse', handleTradeResponse);

    return () => {
      socket.off('tradeOffer', handleTradeOffer);
      socket.off('tradeResponse', handleTradeResponse);
    };
  }, [socket]);

  const handlePlayerSelect = (playerId) => {
    setSelectedPlayer(playerId);
    setSelectedProperty(null);
  };

  const handlePropertySelect = (propertyId) => {
    setSelectedProperty(propertyId);
  };

  const handleAmountChange = (e) => {
    const amount = parseInt(e.target.value);
    if (!isNaN(amount) && amount >= 0) {
      setOfferAmount(amount);
    }
  };

  const handleSendOffer = () => {
    if (selectedPlayer && selectedProperty && offerAmount >= 0) {
      socket.emit('tradeOffer', {
        toPlayerId: selectedPlayer,
        propertyId: selectedProperty,
        amount: offerAmount,
        offerId: Date.now() // Use timestamp as unique ID
      });
    }
  };

  const handleTradeResponse = (offerId, accepted) => {
    socket.emit('tradeResponse', { offerId, accepted });
    setIncomingTrades(prev => prev.filter(trade => trade.offerId !== offerId));
  };

  const otherPlayers = players.filter(p => p.socketId !== player?.socketId);
  const selectedPlayerData = players.find(p => p.socketId === selectedPlayer);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      padding: '10px',
      height: '100%',
      overflowY: 'auto'
    }}>
      {/* Toggle button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        style={{
          padding: '8px 16px',
          backgroundColor: showPanel ? '#f44336' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '10px'
        }}
      >
        {showPanel ? 'Close Trade' : 'Open Trade'}
      </button>

      {showPanel && (
        <>
          {/* Player selection */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
            <label>Select Player:</label>
            <div style={{
              display: 'flex',
              gap: '5px',
              flexWrap: 'wrap'
            }}>
              {otherPlayers.map(p => (
                <button
                  key={p.socketId}
                  onClick={() => handlePlayerSelect(p.socketId)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: selectedPlayer === p.socketId ? '#2196F3' : '#ddd',
                    color: selectedPlayer === p.socketId ? 'white' : 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Property selection */}
          {selectedPlayer && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '5px'
            }}>
              <label>Select Property:</label>
              <div style={{
                display: 'flex',
                gap: '5px',
                flexWrap: 'wrap'
              }}>
                {selectedPlayerData?.properties?.map(propId => {
                  const property = tiles.find(t => t.id === propId);
                  return (
                    <button
                      key={propId}
                      onClick={() => handlePropertySelect(propId)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: selectedProperty === propId ? '#2196F3' : '#ddd',
                        color: selectedProperty === propId ? 'white' : 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {property?.name || `Property ${propId}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Offer amount */}
          {selectedProperty && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '5px'
            }}>
              <label>Offer Amount:</label>
              <input
                type="number"
                value={offerAmount}
                onChange={handleAmountChange}
                style={{
                  padding: '5px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              />
              <button
                onClick={handleSendOffer}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                Send Offer
              </button>
            </div>
          )}
        </>
      )}

      {/* Incoming trade offers */}
      {incomingTrades.length > 0 && (
        <div style={{
          marginTop: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <h3>Incoming Offers:</h3>
          {incomingTrades.map(trade => {
            const fromPlayer = players.find(p => p.socketId === trade.fromPlayerId);
            const property = tiles.find(t => t.id === trade.propertyId);
            return (
              <div
                key={trade.offerId}
                style={{
                  padding: '10px',
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  borderRadius: '4px'
                }}
              >
                <p>{fromPlayer?.name} offers ${trade.amount} for {property?.name}</p>
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  marginTop: '5px'
                }}>
                  <button
                    onClick={() => handleTradeResponse(trade.offerId, true)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleTradeResponse(trade.offerId, false)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Decline
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