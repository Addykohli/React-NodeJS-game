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
  const { players } = useContext(GameContext);
  const [boardSize, setBoardSize] = useState({ width: 600, height: 600 });
  const [pieceScales, setPieceScales] = useState({});
  // Add state for branch options and handler
  const [branchOptions, setBranchOptions] = useState(null);
  const [chooseBranchFn, setChooseBranchFn] = useState(null);

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

  // Listen for branchOptionsUpdate event from DiceRoller
  useEffect(() => {
    const handler = (e) => {
      setBranchOptions(e.detail.branchOptions);
      setChooseBranchFn(() => e.detail.chooseBranch);
    };
    window.addEventListener('branchOptionsUpdate', handler);
    return () => window.removeEventListener('branchOptionsUpdate', handler);
  }, []);

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

        {/* Player pieces */}
        {players.map((p, i) => {
        
          
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

        {/* Branch options buttons centered at their tile.position */}
        {branchOptions && branchOptions.length > 0 && branchOptions.map((toTileId, i) => {
          const tile = tiles.find(t => t.id === toTileId);
          if (!tile) return null;
          const label = tile.name;
          return (
            <button
              key={i}
              onClick={() => chooseBranchFn && chooseBranchFn(i)}
              style={{
                position: 'absolute',
                top: tile.position.y,
                left: tile.position.x,
                transform: 'translate(-50%, -50%)',
                padding: '15px 25px',
                fontSize: '1.3em',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                transition: 'transform 0.2s',
                zIndex: 1001
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Property Displays */}
      <PropertyDisplay />
    </div>
  );
};

export default Board;
