import React, { useContext, useEffect, useState } from 'react';
import { GameContext } from '../context/GameContext';
import { tiles } from '../data/tiles';

const pieceImages = {};
for (let i = 1; i <= 8; i++) {
  pieceImages[`piece${i}.png`] = require(`../assets/pieces/piece${i}.png`);
}
const PIECE_DISPLAY_WIDTH = 70; 

const PlayerStats = () => {
  const { players, player, currentPlayerId, diceRoll, socket } = useContext(GameContext);
  const [diceRolls, setDiceRolls] = useState({});
  const [pieceScales, setPieceScales] = useState({});

  useEffect(() => {
    if (!socket) return;

    const handleStateUpdate = () => {
      setDiceRolls(prev => ({ ...prev }));
    };

    
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

  
  useEffect(() => {
    if (diceRoll) {
      setDiceRolls(prev => ({
        ...prev,
        [diceRoll.playerId]: diceRoll
      }));
    }

  }, [diceRoll]);

  
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
  }, []);

  
  const others = players && player
    ? players.filter(p => p && p.socketId !== player?.socketId)
    : [];

  
  const getPositions = (numPlayers) => {
    switch(numPlayers) {
      case 1: 
        return [{ position: 'left' }];
      case 2: 
        return [{ position: 'left', top: '50%' }, { position: 'right', top: '50%' }];
      case 3: 
        return [
          { position: 'left', top: '50%' },
          { position: 'right', top: '50%' },
          { position: 'top' , left: '50%'}
        ];
      case 4: 
        return [
          { position: 'left', top: '50%' },
          { position: 'right', top: '50%' },
          { position: 'top' , left: '33%'},
          { position: 'top' , left: '66%'}
        ];
      case 5: 
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'right', top: '25%' },
          { position: 'right', top: '75%' },
          { position: 'top' , left: '50%'}
        ];
      case 6: 
        return [
          { position: 'left', top: '25%' },
          { position: 'left', top: '75%' },
          { position: 'right', top: '25%' },
          { position: 'right', top: '75%' },
          { position: 'top' , left: '33%'},
          { position: 'top' , left: '66%'}
        ];
      case 7: 
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
        const currentTile = tiles.find(t => t.id === p.tileId)?.name || 'Unknown';

        const style = {
          position: 'absolute',
          border: '4px outset rgb(190, 190, 190)',
          padding: '16px',
          background: isCurrentPlayer ? 'rgba(76, 175, 80, 0.8)' : 'rgba(80, 80, 80, 0.8)',
          fontSize: '1.5rem',
          color: 'white',
          width: '400px', 
          borderRadius: '12px',
          boxShadow: '0 3px 6px rgba(0,0,0,0.2)',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          overflow: 'visible' 
        };

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
                paddingBottom: '12px', 
                fontWeight: 'bold',
                display: 'block',
                maxWidth: '180px',
                wordBreak: 'break-word',
                whiteSpace: 'pre-line',
                overflowWrap: 'break-word',
                fontSize: '1.3em',
                marginLeft: '70px'
              }}>{p.name}

              </div>
              <div style={{ 
                fontSize: '1.1em', 
                marginBottom: '4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                paddingLeft: '20px'
              }}>
                Money: ${p.money?.toLocaleString() || 0}
              </div>
              {p.loan > 0 && (
                <div style={{ 
                  fontSize: '1.1em', 
                  marginBottom: '4px', 
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  paddingLeft: '20px'
                }}>
                  Loan: ${p.loan?.toLocaleString()}
                </div>
              )}
              <div style={{ 
                fontSize: '1.1em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                paddingLeft: '20px'
              }}>
                At: {currentTile}
              </div>
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