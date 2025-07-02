import React, { useContext, useEffect, useState } from 'react';
import { GameContext } from '../context/GameContext';
import Dicebox from '../assets/diceBoard.png';
import { tiles } from '../data/tiles';

// Import piece images
const pieceImages = {};
for (let i = 1; i <= 8; i++) {
  pieceImages[`piece${i}.png`] = require(`../assets/pieces/piece${i}.png`);
}
const PIECE_DISPLAY_WIDTH = 70; // px

const PlayerStats = () => {
  const { players, player, currentPlayerId, diceRoll, socket } = useContext(GameContext);
  const [diceRolls, setDiceRolls] = useState({});
  const [pieceScales, setPieceScales] = useState({});

  // Listen for all money and property changing events
  useEffect(() => {
    if (!socket) return;

    const handleStateUpdate = () => {
      // Force a re-render by updating dice rolls state
      setDiceRolls(prev => ({ ...prev }));
    };

    // Subscribe to all money and property changing events
    socket.on('rentPaid', handleStateUpdate);
    socket.on('startBonus', handleStateUpdate);
    socket.on('propertyUpdated', handleStateUpdate);
    socket.on('casinoResult', handleStateUpdate);
    socket.on('roadCashResult', handleStateUpdate);
    socket.on('loanUpdated', handleStateUpdate);
    socket.on('tradeAccepted', handleStateUpdate);
    socket.on('playerMoved', handleStateUpdate);
    socket.on('rentBonus', handleStateUpdate);

    return () => {
      // Cleanup all event listeners
      socket.off('rentPaid', handleStateUpdate);
      socket.off('startBonus', handleStateUpdate);
      socket.off('propertyUpdated', handleStateUpdate);
      socket.off('casinoResult', handleStateUpdate);
      socket.off('roadCashResult', handleStateUpdate);
      socket.off('loanUpdated', handleStateUpdate);
      socket.off('tradeAccepted', handleStateUpdate);
      socket.off('playerMoved', handleStateUpdate);
      socket.off('rentBonus', handleStateUpdate);
    };
  }, [socket]);

  // Update dice rolls when a new roll happens
  useEffect(() => {
    if (diceRoll) {
      setDiceRolls(prev => ({
        ...prev,
        [diceRoll.playerId]: diceRoll
      }));
    }
  }, [diceRoll]);

  // Calculate piece scales once for all pieces
  useEffect(() => {
    const calculateScales = async () => {
      const scales = {};
      for (let i = 1; i <= 8; i++) {
        const img = new window.Image();
        img.src = pieceImages[`piece${i}.png`];
        await new Promise(resolve => img.onload = resolve);
        scales[`piece${i}.png`] = { width: img.width, height: img.height };
      }
      setPieceScales(scales);
    };
    calculateScales();
    // eslint-disable-next-line
  }, []);

  // Filter out current player and get others
  const others = players && player
    ? players.filter(p => p && p.socketId !== player?.socketId)
    : [];

  // Get positions based on number of players
  const getPositions = (numPlayers) => {
    switch(numPlayers) {
      case 1: // Just one other player
        return [{ position: 'left' }];
      case 2: // Two other players
        return [{ position: 'left', top: '25%' }, { position: 'left', top: '75%' }];
      case 3: // Three other players
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'top' , left: '50%'}
        ];
      case 4: // Four other players
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'top' , left: '33%'},
          { position: 'top' , left: '66%'}
        ];
      case 5: // Five other players
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'right', top: '25%' },
          { position: 'right', top: '75%' },
          { position: 'top' , left: '50%'}
        ];
      case 6: // Six other players
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'right', top: '25%' },
          { position: 'right', top: '75%' },
          { position: 'top' , left: '33%'},
          { position: 'top' , left: '66%'}
        ];
      case 7: // Seven other players
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'right', top: '25%' },
          { position: 'right', top: '75%' },
          { position: 'top' , left: '25%'},
          { position: 'top' , left: '50%'},
          { position: 'top' , left: '75%'}
        ];
      default:
        return [];
    }
  };

  const positions = getPositions(others.length);

  // Helper to get piece dimensions preserving aspect ratio
  const getPieceDims = (piece, pieceScales) => {
    if (!piece || !pieceScales[piece]) {
      return { width: PIECE_DISPLAY_WIDTH, height: PIECE_DISPLAY_WIDTH };
    }
    const scale = pieceScales[piece];
    const aspect = scale.width / scale.height;
    return {
      width: PIECE_DISPLAY_WIDTH,
      height: PIECE_DISPLAY_WIDTH / aspect
    };
  };

  return (
    <>
      {others.map((p, idx) => {
        const pos = positions[idx];
        if (!pos) return null;

        const isCurrentPlayer = p.socketId === currentPlayerId;
        const playerDice = diceRolls[p.socketId];
        const currentTile = tiles.find(t => t.id === p.tileId)?.name || 'Unknown';

        const style = {
          position: 'absolute',
          border: '4px outset rgb(190, 190, 190)',
          padding: '16px',
          background: isCurrentPlayer ? 'rgba(76, 175, 80, 0.61)' : 'rgba(80, 80, 80, 0.61)',
          fontSize: '1.5rem',
          color: 'white',
          width: '340px', 
          borderRadius: '12px',
          boxShadow: '0 3px 6px rgba(0,0,0,0.2)',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          overflow: 'visible' 
        };

        // Apply position based on placement
        if (pos.position === 'left') {
          style.right = 'calc(100% + 235px)';
          style.top = pos.top || '50%';
          style.transform = 'translate(0, -50%)';
        } else if (pos.position === 'right') {
          style.left = 'calc(100% + 235px)';
          style.top = pos.top || '50%';
          style.transform = 'translate(0, -50%)';
        } else if (pos.position === 'top') {
          style.bottom = 'calc(100% + 200px)';
          style.left = pos.left || '50%';
          style.transform = 'translate(-50%, 0)';
        }

        // Piece image and dimensions
        let pieceImg = null;
        let pieceDims = { width: PIECE_DISPLAY_WIDTH, height: PIECE_DISPLAY_WIDTH };
        if (p.piece && pieceImages[p.piece]) {
          pieceImg = pieceImages[p.piece];
          pieceDims = getPieceDims(p.piece, pieceScales);
        }

        return (
          <div key={p.socketId} style={style}>
            {/* Stats content */}
            <div style={{ flex: 1 }}>
              <div style={{ 
                marginBottom: '8px', 
                fontWeight: 'bold',
                display: 'inline-block',
                maxWidth: '180px',
                wordBreak: 'break-word',
                whiteSpace: 'pre-line',
                overflowWrap: 'break-word'
              }}>
                {/* Insert a line break after 8 characters if name is longer */}
                {p.name && p.name.length > 8
                  ? (
                      <>
                        {p.name.slice(0, 8)}
                        <wbr />
                        {'\n'}
                        {p.name.slice(8)}
                      </>
                    )
                  : p.name
                }
              </div>
              <div style={{ 
                fontSize: '1.2rem', 
                marginBottom: '4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                Money: ${p.money?.toLocaleString() || 0}
              </div>
              {p.loan > 0 && (
                <div style={{ 
                  fontSize: '1.2rem', 
                  marginBottom: '4px', 
                  color: '#ff6b6b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  Loan: ${p.loan?.toLocaleString()}
                </div>
              )}
              <div style={{ 
                fontSize: '1.2rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                At: {currentTile}
              </div>
              {playerDice && (
                <div style={{
                  marginTop: '8px',
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'center'
                }}>
                  <img
                    src={`/dice/dice${playerDice.die1}.png`}
                    alt={`Die ${playerDice.die1}`}
                    width={40}
                    height={40}
                  />
                  <img
                    src={`/dice/dice${playerDice.die2}.png`}
                    alt={`Die ${playerDice.die2}`}
                    width={40}
                    height={40}
                  />
                </div>
              )}
            </div>
          
            {/* Player piece */}
            <div style={{
              width: PIECE_DISPLAY_WIDTH,
              height: pieceDims.height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {pieceImg && (
                <img
                  src={pieceImg}
                  alt="Piece"
                  style={{
                    width: PIECE_DISPLAY_WIDTH,
                    height: pieceDims.height,
                    objectFit: 'contain',
                    display: 'block'
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default PlayerStats;