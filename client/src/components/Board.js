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
  const [showOwnership, setShowOwnership] = useState(false);
  // Using socket from GameContext

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
    const onToggleOwnershipView = ({ show }) => setShowOwnership(show);
    
    socket.on('branchChoices', onBranchChoices);
    socket.on('toggleOwnershipView', onToggleOwnershipView);

    return () => {
      socket.off('branchChoices', onBranchChoices);
      socket.off('toggleOwnershipView', onToggleOwnershipView);
    };
  }, [player, socket]);
  
  // Get the current player's properties
  const playerProperties = player?.properties || [];
  const otherPlayersProperties = players
    .filter(p => p.socketId !== player?.socketId)
    .reduce((acc, p) => [...acc, ...(p.properties || [])], []);

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
      
      {/* Ownership visualization */}
      {showOwnership && tiles.map(tile => {
        if (!tile.location) return null;
        
        const isOwnedByPlayer = playerProperties.some(prop => prop.tileId === tile.id);
        const isOwnedByOther = otherPlayersProperties.some(prop => prop.tileId === tile.id);
        
        let color = 'rgba(255, 255, 255, 0.4)'; // White for unowned
        if (isOwnedByPlayer) {
          color = 'rgba(0, 255, 0, 0.4)'; // Green for owned by player
        } else if (isOwnedByOther) {
          color = 'rgba(255, 0, 0, 0.4)'; // Red for owned by others
        }
        
        return (
          <div
            key={`ownership-${tile.id}`}
            style={{
              position: 'absolute',
              left: `${tile.location.x - 5}px`,
              top: `${tile.location.y - 5}px`,
              width: '20px',
              height: '20px',
              backgroundColor: color,
              borderRadius: '2px',
              zIndex: 10,
              pointerEvents: 'none'
            }}
          />
        );
      })}
      
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
            const imgSrc = pieceImages[p.piece];
            if (!imgSrc) {
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
