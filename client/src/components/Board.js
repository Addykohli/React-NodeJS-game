import React, { useContext, useState, useEffect } from 'react';
import { GameContext } from '../context/GameContext';
import boardImage from '../assets/board.png';
import outerBoardImage from '../assets/outerBoard.png';
import { tiles } from '../data/tiles';
import PropertyDisplay from './PropertyDisplay';
import TopPropertyDisplay from './TopPropertyDisplay';

const pieceImages = {};
for (let i = 1; i <= 8; i++) {
  pieceImages[`piece${i}.png`] = require(`../assets/pieces/piece${i}.png`);
}

const REFERENCE_HEIGHT = 165;

const Board = () => {
  const [boardSize, setBoardSize] = useState({ width: 600, height: 600 });
  const [pieceScales, setPieceScales] = useState({});
  const { player, players, socket } = useContext(GameContext);
  const [branchOptions, setBranchOptions] = useState(null);
  const [showOwnership, setShowOwnership] = useState(() => {

    const saved = localStorage.getItem('showOwnershipView');
    return saved === 'true';
  });

  useEffect(() => {
    const handleOwnershipToggle = (event) => {
      setShowOwnership(event.detail.show);
    };

    window.addEventListener('ownershipViewToggle', handleOwnershipToggle);
    return () => {
      window.removeEventListener('ownershipViewToggle', handleOwnershipToggle);
    };
  }, []);

  const propertyTiles = tiles.filter(tile => tile.type === 'property');

  const isOwnedByCurrentPlayer = (tile) => {
    return player?.properties?.includes(tile.id);
  };

  const getTileOwner = (tile) => {
    return players.find(p => p.properties?.includes(tile.id));
  };

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setBoardSize({ width: img.width, height: img.height });
    img.src = boardImage;
  }, []);

  
  useEffect(() => {
    const calculateScales = async () => {
      const scales = {};
      for (let i = 1; i <= 8; i++) {
        const img = new Image();
        img.src = pieceImages[`piece${i}.png`];
        await new Promise(resolve => img.onload = resolve);
        
        const width = REFERENCE_HEIGHT * (img.width / img.height);
        scales[`piece${i}.png`] = { width, height: REFERENCE_HEIGHT };
      }
      setPieceScales(scales);
    };

    calculateScales();
  }, []);
  useEffect(() => {
    const onBranchChoices = ({ options }) => setBranchOptions(options);
    socket.on('branchChoices', onBranchChoices);

    return () => {
      socket.off('branchChoices', onBranchChoices);
    };
  }, [player, socket]);

  const chooseBranch = (idx) => {
    socket.emit('branchChoice', idx);
    setBranchOptions(null);
  };

  return (
    <div style={{
      position: 'relative',
      width: boardSize.width,
      height: boardSize.height,
      margin: '0 auto'
    }}>
      <TopPropertyDisplay />
      
      {/* Outer board image */}
      <img
        src={outerBoardImage}
        alt="Outer Board"
        style={{
          position: 'absolute',
          top: 'calc(50% + 4px)',
          left: 'calc(50% - 4px)',
          transform: 'translate(-50%, -50%)',
          width: '101.2%',
          height: '102%',
          zIndex: 2
        }}
      />

      {/* Main board image */}
      <div style={{
        position: 'relative',
        zIndex: 4
      }}>
        <img
          src={boardImage}
          alt="Board"
          style={{
            width: '100%',
            position: 'relative',
            zIndex: 4
          }}
        />

        {/* Ownership indicators */}
        {showOwnership && propertyTiles.map((tile) => {
          const owner = getTileOwner(tile);
          let fillColor = 'rgba(255, 255, 255, 0.6)'; 
          
          if (owner) {
            fillColor = owner.socketId === player?.socketId 
              ? 'rgba(0, 255, 0, 0.6)' 
              : 'rgba(255, 0, 0, 0.6)'; 
          }
          
          return (
            <div
              key={`ownership-${tile.id}`}
              style={{
                position: 'absolute',
                left: `${tile.position.x - 60}px`, 
                top: `${tile.position.y - 60}px`,
                width: '120px',
                height: '120px',
                backgroundColor: fillColor,
                border: '2px solid rgba(255, 255, 255, 0.8)',
                borderRadius: '8px',
                zIndex: 15, 
                pointerEvents: 'none',
                boxShadow: '0 0 15px rgba(0,0,0,0.3)' 
              }}
            />
          );
        })}

        {/* Branch options */}
        {branchOptions && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 20
            }}
          >
            <style>
              {`
                .branch-arrow-btn {
                  background: transparent;
                  border: none;
                  padding: 0;
                  cursor: pointer;
                  pointer-events: auto;
                  outline: none;
                  animation: branchArrowBounce 0.8s infinite alternate;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                @keyframes branchArrowBounce {
                  0% { transform: translateY(-8px); }
                  100% { transform: translateY(8px); }
                }
                .branch-arrow-svg {
                  display: block;
                  width: 200px;
                  height: 250px;
                  opacity: 0.9;
                }
              `}
            </style>
            {branchOptions.map((toTileId, i) => {
              const tile = tiles.find((t) => t.id === toTileId);
              const position = tile ? tile.position : { x: 0, y: 0 };
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: position.y - 40,
                    left: position.x,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                  }}
                >
                  <button
                    className="branch-arrow-btn"
                    onClick={() => chooseBranch(i)}
                    aria-label="Choose branch"
                  >
                    <svg
                      className="branch-arrow-svg"
                      viewBox="0 0 200 250"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <polygon
                        points="100,210 40,120 75,120 75,40 125,40 125,120 160,120"
                        fill="rgba(45, 225, 60, 0.88)"
                        stroke="rgba(195, 195, 195, 0.45)"
                        strokeWidth="12"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Player pieces */}
        {(!players || players.length === 0 || Object.keys(pieceScales).length === 0) ? null : (() => {
          const playersByTile = {};
          players.forEach((p) => {
            if (!playersByTile[p.tileId]) playersByTile[p.tileId] = [];
            playersByTile[p.tileId].push(p);
          });

          return players.map((p, i) => {
            if (!p) {
              console.log(`[Board] Missing player at index ${i}`);
              return null;
            }
            const isPiece3 = p.piece === 'piece3.png';
            const isPiece5 = p.piece === 'piece5.png';
            const isPiece6 = p.piece === 'piece6.png';
            const imgSrc = pieceImages[p.piece];
            if (!imgSrc && !isPiece3 && !isPiece5 && !isPiece6) {
              console.log(`[Board] Invalid piece for ${p.name}:`, p.piece);
              return null;
            }
            const tile = tiles.find(t => t.id === p.tileId);
            if (!tile) {
              console.log(`[Board.js] Player ${p.name} on missing tileId:`, p.tileId);
              return null;
            }
            const { x, y } = tile.position;
            const dimensions = pieceScales[p.piece] || { width: 'auto', height: REFERENCE_HEIGHT };
            const sameTilePlayers = playersByTile[p.tileId];
            const idxOnTile = sameTilePlayers.findIndex(pl => pl.socketId === p.socketId);
            const totalOnTile = sameTilePlayers.length;
            let offsetX = 0, offsetY = 0;
            if (totalOnTile > 1) {
              const radius = 22;
              const angle = (2 * Math.PI / totalOnTile) * idxOnTile;
              offsetX = Math.cos(angle) * radius;
              offsetY = Math.sin(angle) * radius;
            }
            
            if (isPiece3) {
              const currentTile = tiles.find(t => t.id === p.tileId);
              const prevTile = tiles.find(t => t.id === p.prevTile);
              
              let rotation = 0;
              if (currentTile && prevTile) {
                const dx = currentTile.position.x - prevTile.position.x;
                const dy = currentTile.position.y - prevTile.position.y;
                
                if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {  
                  rotation = -(Math.atan2(dy, dx) * (180 / Math.PI) + 90);
                  rotation = (rotation + 360) % 360;
                }
              }
              
              return (
                <div 
                  key={p.socketId}
                  title={p.name}
                  style={{
                    position: 'absolute',
                    top: y + offsetY,
                    left: x + offsetX,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                    width: '400px',
                    height: '400px',
                    pointerEvents: 'none',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                    background: 'transparent'
                  }}
                >
                  <img 
                    src="https://media.tenor.com/HxNZ_ZyJsRkAAAAm/mini-pekka-camiando.webp" 
                    alt="Player Piece"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      pointerEvents: 'none',
                      transform: `rotate(${-rotation}deg)`,
                      transition: 'transform 0.0002s',
                      transformOrigin: 'center center'
                    }}
                  />
                </div>
              );
            }

            
            if (isPiece5) {
              return (
                <div 
                  key={p.socketId}
                  title={p.name}
                  style={{
                    position: 'absolute',
                    top: y + offsetY,
                    left: x + offsetX,
                    transform: 'translate(-50%, -50%)',
                    transition: 'top 0.3s, left 0.3s',
                    zIndex: 10,
                    width: '150px',
                    height: '220px',
                    pointerEvents: 'none',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                    background: 'transparent'
                  }}
                >
                  <img 
                    src="https://media.tenor.com/RKwYeBPr3pEAAAAi/me.gif" 
                    alt="Player Piece"
                    style={{
                      width: '150px',
                      height: '190px',
                      objectFit: 'contain',
                      pointerEvents: 'none',
                      transform: 'translateY(-20%)' 
                    }}
                  />
                </div>
              );
            }

            if (isPiece6) {
              const currentTile = tiles.find(t => t.id === p.tileId);
              const prevTile = tiles.find(t => t.id === p.prevTile);
              
              let rotation = 180;
              if (currentTile && prevTile) {
                const dx = currentTile.position.x - prevTile.position.x;
                const dy = currentTile.position.y - prevTile.position.y;
                
                if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {  
                  rotation = -Math.atan2(dy, dx) * (180 / Math.PI) + 90;
                  rotation = (rotation + 360) % 360;
                }
              }
              
              return (
                <div 
                  key={p.socketId}
                  title={p.name}
                  style={{
                    position: 'absolute',
                    top: y + offsetY,
                    left: x + offsetX,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                    width: dimensions.width,
                    height: dimensions.height,
                    pointerEvents: 'none',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                    background: 'transparent'
                  }}
                >
                  <img 
                    src={imgSrc} 
                    alt={p.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      pointerEvents: 'none',
                      transform: `scaleX(-1) rotate(${rotation}deg)`,
                      transition: 'transform 0.0002s',
                      transformOrigin: 'center center'
                    }}
                  />
                </div>
              );
            }
            
            return (
              <img
                key={p.socketId}
                src={imgSrc}
                alt={p.name}
                title={p.name}
                style={{
                  position: 'absolute',
                  top: y + offsetY,
                  left: x + offsetX,
                  width: dimensions.width,
                  height: dimensions.height,
                  transform: 'translate(-50%, -50%)',
                  transition: 'top 0.3s, left 0.3s',
                  zIndex: 10,
                }}
              />
            );
          });
        })()}

      </div>

      {/* Property Displays */}
      <PropertyDisplay />
    </div>
  );
};

export default Board;
