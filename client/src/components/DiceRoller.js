import React, { useState, useEffect, useContext } from 'react';
import { GameContext } from '../context/GameContext';
import { tiles } from '../data/tiles';
import Dicebox from '../assets/diceBoard.png';

export default function DiceRoller({ testRollMode, hasCasinoPlayed }) {
  const { player, currentPlayerId, socket, movementDone } = useContext(GameContext);
  const isMyTurn = player?.socketId === currentPlayerId;
  const [rolling, setRolling] = useState(false);
  const [die1, setDie1] = useState(null);
  const [die2, setDie2] = useState(null);
  const [done, setDone] = useState(false);
  const [rpsGame, setRpsGame] = useState(null);
  const [hasMoved, setHasMoved] = useState(false);
  const [branchOptions, setBranchOptions] = useState(null);
  const [casinoPlayed, setCasinoPlayed] = useState(hasCasinoPlayed);


  // Get current tile to check if we're on casino
  const tileMeta = tiles.find(t => t.id === player?.tileId);
  const isOnCasino = tileMeta?.id === 16;

  // Update casinoPlayed when prop changes
  useEffect(() => {
    setCasinoPlayed(hasCasinoPlayed);
  }, [hasCasinoPlayed]);

  // Debug logging for RoadCash overlay check
  useEffect(() => {
    console.log('[DEBUG***] Casino turn Check:', {
      isMyTurn,
      die1,
      done
    });
  }, [isMyTurn, die1, done]);

  useEffect(() => {
    console.log('[DEBUG***] rps tie done Check:', {
      isMyTurn,
      rpsGame,
      done,
      isOnCasino,
      casinoPlayed
    });
  }, [isMyTurn, rpsGame, done, isOnCasino, casinoPlayed]);

  useEffect(() => {
    const onDiceResult = ({ playerId, die1, die2 }) => {
      if (playerId === player?.socketId) {
        setDie1(die1);
        setDie2(die2);
        setDone(false);
      }
    };

    const onBranchChoices = ({ options }) => setBranchOptions(options);
    const onMovementDone = () => setDone(true);

    // Add casino result handler
    const onCasinoResult = ({ playerId }) => {
      if (playerId === player?.socketId) {
        setCasinoPlayed(true);
        //setDone(true);
      }
    };

    socket.on('diceResult', onDiceResult);
    socket.on('branchChoices', onBranchChoices);
    socket.on('movementDone', onMovementDone);
    socket.on('casinoResult', onCasinoResult);

    socket.on('stonePaperScissorsStart', (game) => {
      setRpsGame(game);
    });

    socket.on('stonePaperScissorsResult', (result) => {
      // Clear RPS game state regardless of who wins
      setRpsGame(null);
    });

    socket.on('stonePaperScissorsTieResolved', () => {
      setRpsGame(null);
    });

    return () => {
      socket.off('diceResult', onDiceResult);
      socket.off('branchChoices', onBranchChoices);
      socket.off('movementDone', onMovementDone);
      socket.off('casinoResult', onCasinoResult);
      socket.off('stonePaperScissorsStart');
      socket.off('stonePaperScissorsResult');
      socket.off('stonePaperScissorsTieResolved');
    };
  }, [player, socket]);

  if (!player || player.socketId !== currentPlayerId) return null;

  const handleRoll = () => {
    if (!testRollMode) {
      socket.emit('rollDice', { testRoll: null });
    }
    setBranchOptions(null);
  };

  const handleDone = () => {
    socket.emit('endTurn');
    setDie1(null);
    setDie2(null);
    setDone(false);
    setBranchOptions(null);
  };

  const chooseBranch = (idx) => {
    socket.emit('branchChoice', idx);
    setBranchOptions(null);
  };

  const {players} = useContext(GameContext);

  const hasRolled = players.find(p => p.socketId === player?.socketId)?.hasRolled ?? player?.hasRolled ?? false;


  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      {/* Roll button */}
      {!die1 && !hasRolled && !branchOptions && (
        <button
          onClick={handleRoll}
          style={{ 
            padding: '16px 32px',
            margin: '4px',
            opacity: testRollMode ? 0.5 : 1,
            cursor: testRollMode ? 'not-allowed' : 'pointer',
            fontSize: '1.8rem',
            fontWeight: 'bold',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            ':hover': {
              transform: 'scale(1.05)',
              boxShadow: '0 6px 12px rgba(0,0,0,0.6)'
            }
          }}
          disabled={testRollMode}
        >
          {testRollMode ? 'Type testroll#' : 'Roll Dice'}
        </button>
      )}

      {/* Show dice faces once rolled */}
      {die1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            margin: '1rem 0',
          }}
        >
          <img
            src={`/dice/dice${die1}.png`}
            alt={`Die ${die1}`}
            width={100}
            height={100}
          />
          <img
            src={`/dice/dice${die2}.png`}
            alt={`Die ${die2}`}
            width={100}
            height={100}
          />
        </div>
      )}

      {/* Branch options */}
      {branchOptions && (
        <div
          style={{
            display: 'flex',
            gap: '15px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            padding: '20px'
          }}
        >
          {branchOptions.map((toTileId, i) => {
            const tile = tiles.find((t) => t.id === toTileId);
            const label = tile ? tile.name : `Tile ${toTileId}`;
            return (
              <button
                key={i}
                onClick={() => chooseBranch(i)}
                style={{ 
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
                  ':hover': {
                    transform: 'scale(1.05)'
                  }
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Done button - Only show if not on casino or if casino has been played */}
      {done && (!isOnCasino || casinoPlayed) && !rpsGame && (
        <button
          onClick={handleDone}
          style={{ 
            padding: '16px 32px', 
            marginTop: '16px',
            fontSize: '1.5em',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          Done
        </button>
      )}
    </div>
  );
}

