import React, { useState, useContext, useEffect } from 'react';
import { GameContext } from '../context/GameContext';
import { tiles } from '../data/tiles';

export default function TradePanel() {
  const { player, players, socket } = useContext(GameContext);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [receivingProperties, setReceivingProperties] = useState([]);
  const [giveMoney, setGiveMoney] = useState(0);
  const [receiveMoney, setReceiveMoney] = useState(0);
  const [tradeOffers, setTradeOffers] = useState([]);

  useEffect(() => {
    const handleTradeOffer = (offer) => {
      setTradeOffers(prev => [...prev, offer]);
    };

    const handleTradeOfferRemoved = (offerId) => {
      setTradeOffers(prev => prev.filter(offer => offer.id !== offerId));
    };

    socket.on('tradeOffer', handleTradeOffer);
    socket.on('tradeOfferRemoved', handleTradeOfferRemoved);

    return () => {
      socket.off('tradeOffer', handleTradeOffer);
      socket.off('tradeOfferRemoved', handleTradeOfferRemoved);
    };
  }, [socket]);

  const handlePlayerSelect = (playerId) => {
    setSelectedPlayer(playerId);
    setSelectedProperties([]);
    setReceivingProperties([]);
    setGiveMoney(0);
    setReceiveMoney(0);
  };

  const handlePropertyToggle = (propertyId, isGiving) => {
    if (isGiving) {
      setSelectedProperties(prev => 
        prev.includes(propertyId) 
          ? prev.filter(id => id !== propertyId)
          : [...prev, propertyId]
      );
    } else {
      setReceivingProperties(prev => 
        prev.includes(propertyId) 
          ? prev.filter(id => id !== propertyId)
          : [...prev, propertyId]
      );
    }
  };

  const handleMoneyChange = (amount, isGiving) => {
    if (isGiving) {
      setGiveMoney(Math.max(0, Math.min(player.money, amount)));
    } else {
      setReceiveMoney(Math.max(0, amount));
    }
  };

  const handleSendOffer = () => {
    if (!selectedPlayer) return;

    socket.emit('sendTradeOffer', {
      toPlayerId: selectedPlayer,
      giveProperties: selectedProperties,
      receiveProperties: receivingProperties,
      giveMoney,
      receiveMoney
    });

    // Reset form
    setSelectedPlayer(null);
    setSelectedProperties([]);
    setReceivingProperties([]);
    setGiveMoney(0);
    setReceiveMoney(0);
  };

  const handleTradeResponse = (offerId, accepted) => {
    socket.emit('tradeResponse', { offerId, accepted });
    // Remove offer locally immediately for better UX
    setTradeOffers(prev => prev.filter(offer => offer.id !== offerId));
  };

  const getPropertyName = (propertyId) => {
    const property = tiles.find(t => t.id === propertyId);
    return property ? property.name : `Property ${propertyId}`;
  };

  const otherPlayers = players.filter(p => p.socketId !== player?.socketId);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      padding: '20px',
      height: '100%',
      overflowY: 'auto'
    }}>
      {/* Trade Offers Received */}
      {tradeOffers.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          <h3 style={{ margin: 0, color: '#FFA000' }}>Trade Offers</h3>
          {tradeOffers.map(offer => {
            const fromPlayer = players.find(p => p.socketId === offer.fromPlayerId);
            if (!fromPlayer) return null;

            return (
              <div key={offer.id} style={{
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <strong>{fromPlayer.name}</strong> offers:
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <div>Give:</div>
                  <ul style={{ margin: '5px 0' }}>
                    {offer.giveProperties.map(propId => (
                      <li key={propId}>{getPropertyName(propId)}</li>
                    ))}
                    {offer.giveMoney > 0 && (
                      <li>${offer.giveMoney}</li>
                    )}
                  </ul>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <div>Receive:</div>
                  <ul style={{ margin: '5px 0' }}>
                    {offer.receiveProperties.map(propId => (
                      <li key={propId}>{getPropertyName(propId)}</li>
                    ))}
                    {offer.receiveMoney > 0 && (
                      <li>${offer.receiveMoney}</li>
                    )}
                  </ul>
                </div>
                <div style={{
                  display: 'flex',
                  gap: '10px'
                }}>
                  <button
                    onClick={() => handleTradeResponse(offer.id, true)}
                    style={{
                      padding: '8px 16px',
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
                    onClick={() => handleTradeResponse(offer.id, false)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
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

      {/* New Trade Form */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
      }}>
        <h3 style={{ margin: 0, color: '#FFA000' }}>New Trade</h3>
        
        {/* Player Selection */}
        <div>
          <label style={{ marginBottom: '5px', display: 'block' }}>Trade with:</label>
          <select
            value={selectedPlayer || ''}
            onChange={(e) => handlePlayerSelect(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px'
            }}
          >
            <option value="">Select player...</option>
            {otherPlayers.map(p => (
              <option key={p.socketId} value={p.socketId}>{p.name}</option>
            ))}
          </select>
        </div>

        {selectedPlayer && (
          <>
            {/* Your Properties */}
            <div>
              <label style={{ marginBottom: '5px', display: 'block' }}>Your properties to give:</label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '5px'
              }}>
                {player.properties.map(propertyId => (
                  <button
                    key={propertyId}
                    onClick={() => handlePropertyToggle(propertyId, true)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: selectedProperties.includes(propertyId) ? '#2196F3' : 'rgba(33, 150, 243, 0.3)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {getPropertyName(propertyId)}
                  </button>
                ))}
              </div>
            </div>

            {/* Their Properties */}
            <div>
              <label style={{ marginBottom: '5px', display: 'block' }}>Properties to receive:</label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '5px'
              }}>
                {players.find(p => p.socketId === selectedPlayer)?.properties.map(propertyId => (
                  <button
                    key={propertyId}
                    onClick={() => handlePropertyToggle(propertyId, false)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: receivingProperties.includes(propertyId) ? '#2196F3' : 'rgba(33, 150, 243, 0.3)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {getPropertyName(propertyId)}
                  </button>
                ))}
              </div>
            </div>

            {/* Money Exchange */}
            <div style={{
              display: 'flex',
              gap: '10px'
            }}>
              <div>
                <label style={{ marginBottom: '5px', display: 'block' }}>Money to give:</label>
                <input
                  type="number"
                  value={giveMoney}
                  onChange={(e) => handleMoneyChange(parseInt(e.target.value) || 0, true)}
                  style={{
                    width: '100px',
                    padding: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ marginBottom: '5px', display: 'block' }}>Money to receive:</label>
                <input
                  type="number"
                  value={receiveMoney}
                  onChange={(e) => handleMoneyChange(parseInt(e.target.value) || 0, false)}
                  style={{
                    width: '100px',
                    padding: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px'
                  }}
                />
              </div>
            </div>

            {/* Send Offer Button */}
            <button
              onClick={handleSendOffer}
              disabled={!selectedPlayer || (selectedProperties.length === 0 && receivingProperties.length === 0 && giveMoney === 0 && receiveMoney === 0)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#FFA000',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                opacity: (!selectedPlayer || (selectedProperties.length === 0 && receivingProperties.length === 0 && giveMoney === 0 && receiveMoney === 0)) ? 0.5 : 1
              }}
            >
              Send Offer
            </button>
          </>
        )}
      </div>
    </div>
  );
} 