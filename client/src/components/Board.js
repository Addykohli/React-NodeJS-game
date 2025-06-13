import React, { useContext, useState, useEffect } from 'react';
import { GameContext } from '../context/GameContext';
import boardImage from '../assets/board.png';
import outerBoardImage from '../assets/outerBoard.png';
import { tiles } from '../data/tiles';
import PropertyDisplay from './PropertyDisplay';
import TopPropertyDisplay from './TopPropertyDisplay';

// Reference piece height in px
const REFERENCE_HEIGHT = 165;

const Board = () => {
  const { players } = useContext(GameContext);
  const [boardSize, setBoardSize] = useState({ width: 600, height: 600 });
  const [pieceImages, setPieceImages] = useState({});
  const [pieceScales, setPieceScales] = useState({});

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setBoardSize({ width: img.width, height: img.height });
    img.src = boardImage;
  }, []);

  // Load piece images dynamically
  useEffect(() => {
    const loadPieceImages = async () => {
      const images = {};
      for (let i = 1; i <= 8; i++) {
        try {
          const pieceImage = require(`../assets/pieces/piece${i}.png`);
          images[`piece${i}.png`] = pieceImage;
          images[`piece${i}`] = pieceImage; // Also store without .png
        } catch (err) {
          console.error(`Failed to load piece${i} image:`, err);
        }
      }
      setPieceImages(images);
    };

    loadPieceImages();
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
  }, [pieceImages]);

  // Add debug logging for pieces
  useEffect(() => {
    console.log('Pieces debug:', {
      loadedPieces: Object.keys(pieceImages),
      playerPieces: players.map(p => ({
        name: p.name,
        piece: p.piece
      }))
    });
  }, [pieceImages, players]);

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
          if (!p?.piece) {
            console.log(`[Board] Player missing piece:`, p);
            return null;
          }

          // Try both formats for piece image
          const imgSrc = pieceImages[p.piece] || pieceImages[p.piece + '.png'];
          if (!imgSrc) {
            console.error(`[Board] Invalid piece for ${p.name}:`, p.piece);
            return null;
          }

          const tile = tiles.find(t => t.id === p.tileId);
          if (!tile) return null;

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
