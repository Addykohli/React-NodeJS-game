import React, { useContext, useState, useEffect } from 'react';
import { GameContext } from '../context/GameContext';
import boardImage from '../assets/board.png';
import outerBoardImage from '../assets/outerBoard.png';
import { tiles } from '../data/tiles';
import PropertyDisplay from './PropertyDisplay';
import TopPropertyDisplay from './TopPropertyDisplay';

// Map piece names to images
const pieceImages = {};
for (let i = 1; i <= 8; i++) {
  pieceImages[`piece${i}.png`] = require(`../assets/pieces/piece${i}.png`);
}

// Reference piece height in px
const REFERENCE_HEIGHT = 165;

const Board = () => {
  const [boardSize, setBoardSize] = useState({ width: 600, height: 600 });
  const [pieceScales, setPieceScales] = useState({});
  const { player, players, currentPlayerId, socket, movementDone } = useContext(GameContext);
  const [branchOptions, setBranchOptions] = useState(null);



  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setBoardSize({ width: img.width, height: img.height });
    img.src = boardImage;
  }, []);

  // Calculate scales for all pieces based on piece1's height
  useEffect(() => {
    const calculateScales = async () => {
      const scales = {};
      // Load piece1 first to get reference dimensions
      const piece1 = new Image();
      piece1.src = pieceImages['piece1.png'];
      await new Promise(resolve => piece1.onload = resolve);
      const referenceRatio = piece1.width / piece1.height;

      // Calculate scales for all pieces
      for (let i = 1; i <= 8; i++) {
        const img = new Image();
        img.src = pieceImages[`piece${i}.png`];
        await new Promise(resolve => img.onload = resolve);
        
        // Calculate the width that maintains aspect ratio at reference height
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
        {(!players || players.length === 0 || Object.keys(pieceScales).length === 0) ? null : players.map((p, i) => {
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
          
          return (
            <img
              key={p.socketId}
              src={imgSrc}
              alt={p.name}
              title={p.name}
              style={{
                position: 'absolute',
                top: y + i * 10,
                left: x + i * 10,
                width: dimensions.width,
                height: dimensions.height,
                transform: 'translate(-50%, -50%)',
                transition: 'top 0.3s, left 0.3s',
                zIndex: 10,
              }}
            />
          );
        })}
      </div>

      {/* Property Displays */}
      <PropertyDisplay />
    </div>
  );
};

export default Board;
