import React, { useState, useEffect, useContext, useRef } from 'react';
import { GameContext } from '../context/GameContext';
import { tiles } from '../data/tiles';
import CasinoDice from './CasinoDice';

const diceImages = {};
for (let i = 1; i <= 6; i++) {
  diceImages[i] = require(`../assets/dice/dice${i}.png`);
}

export default function DiceRoller({ testRollMode, hasCasinoPlayed }) {
  const { player, players, currentPlayerId, socket } = useContext(GameContext);
  const [die1, setDie1] = useState(null);
  const [die2, setDie2] = useState(null);
  const [done, setDone] = useState(false);
  const [rpsGame, setRpsGame] = useState(null);
  const [branchOptions, setBranchOptions] = useState(null);
  const [casinoPlayed, setCasinoPlayed] = useState(hasCasinoPlayed);
  const [showDiceRoll, setShowDiceRoll] = useState(false);
  const [diceValues, setDiceValues] = useState(null);
  const diceRollRef = useRef(null);

  const tileMeta = tiles.find(t => t.id === player?.tileId);

  const isOnCasino = tileMeta?.id === 16;

  
  useEffect(() => {
    setCasinoPlayed(hasCasinoPlayed);
  }, [hasCasinoPlayed]);

  useEffect(() => {
    const onDiceResult = ({ playerId, die1, die2 }) => {
      if (playerId === player?.socketId) {
        setDiceValues([die1, die2]);
        setShowDiceRoll(true);
        setDie1(die1);
        setDie2(die2);
        setDone(false);
      }
    };

    const onBranchChoices = ({ options }) => setBranchOptions(options);
    const onMovementDone = () => setDone(true);

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

  const hasRolled = players.find(p => p.socketId === player?.socketId)?.hasRolled ?? player?.hasRolled ?? false;
  
  
  
  const currentPlayer = players.find(p => p.socketId === currentPlayerId);
  if (!player || !currentPlayer || player.name !== currentPlayer.name) {
      return null;
  }

  const handleRoll = () => {
    if (!testRollMode) {
      // Show loading state for dice roll
      setShowDiceRoll(true);
      socket.emit('rollDice', { testRoll: null });
    }
    setBranchOptions(null);
  };

  const handleDiceAnimationComplete = () => {
    setShowDiceRoll(false);
  };

  const handleDone = () => {
    socket.emit('endTurn');
    setDie1(null);
    setDie2(null);
    setDone(false);
    setBranchOptions(null);
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        marginTop: '1rem',
        zIndex: 100
      }}
    >
      {/* 3D Dice Animation */}
      {showDiceRoll && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
          pointerEvents: 'none'
        }}>
          <CasinoDice 
            ref={diceRollRef}
            diceValues={diceValues}
            onAnimationComplete={handleDiceAnimationComplete}
          />
        </div>
      )}
      {/* Roll button */}
      {!die1 && !hasRolled && !branchOptions && (
        <button
          onClick={handleRoll}
          style={{
            padding: '17px 40px',
            borderRadius: '10px',
            border: 0,
            backgroundColor: 'rgb(76, 175, 80)', 
            letterSpacing: '1.5px',
            fontSize: '1.8rem',
            transition: 'all 0.3s ease',
            boxShadow: 'rgb(46, 115, 0) 0px 10px 0px 0px',
            color: 'hsl(0, 0%, 100%)',
            cursor: testRollMode ? 'not-allowed' : 'pointer',
            opacity: testRollMode ? 0.5 : 1,
          }}
          disabled={testRollMode}
          onMouseOver={e => {
            e.currentTarget.style.boxShadow = 'rgb(46, 115, 0) 0px 7px 0px 0px';
          }}
          onMouseOut={e => {
            e.currentTarget.style.boxShadow = 'rgb(46, 115, 0) 0px 10px 0px 0px';
          }}
          onMouseDown={e => {
            e.currentTarget.style.backgroundColor = 'rgb(76, 175, 80)';
            e.currentTarget.style.boxShadow = 'rgb(46, 115, 0) 0px 0px 0px 0px';
            e.currentTarget.style.transform = 'translateY(5px)';
            e.currentTarget.style.transition = '200ms';
          }}
          onMouseUp={e => {
            e.currentTarget.style.backgroundColor = '#4CAF50';
            e.currentTarget.style.boxShadow = 'rgb(46, 115, 0) 0px 10px 0px 0px';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.transition = 'all 0.3s ease';
          }}
        >
          {testRollMode ? 'Type testroll#' : 'Roll Dice'}
        </button>
      )}

      {die1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            margin: '1rem 0',
          }}
        >
          {(die1 && die2) && (
            <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
              <p>Dice roll result: {die1} and {die2}</p>
            </div>
          )}
        </div>
      )}

      {done && (!isOnCasino || casinoPlayed) && !rpsGame && hasRolled &&(
        <button
          onClick={handleDone}
          style={{
            padding: '17px 40px',
            borderRadius: '10px',
            border: 0,
            backgroundColor: 'rgb(76, 175, 80)',
            letterSpacing: '1.5px',
            fontSize: '1.5em',
            transition: 'all 0.3s ease',
            boxShadow: 'rgb(46, 115, 0) 0px 10px 0px 0px',
            color: 'hsl(0, 0%, 100%)',
            cursor: 'pointer',
            marginTop: '16px',
          }}
          onMouseOver={e => {
            e.currentTarget.style.boxShadow = 'rgb(46, 115, 0) 0px 7px 0px 0px';
          }}
          onMouseOut={e => {
            e.currentTarget.style.boxShadow = 'rgb(46, 115, 0) 0px 10px 0px 0px';
          }}
          onMouseDown={e => {
            e.currentTarget.style.backgroundColor = 'rgb(76, 175, 80)';
            e.currentTarget.style.boxShadow = 'rgb(46, 115, 0) 0px 0px 0px 0px';
            e.currentTarget.style.transform = 'translateY(5px)';
            e.currentTarget.style.transition = '200ms';
          }}
          onMouseUp={e => {
            e.currentTarget.style.backgroundColor = '#4CAF50';
            e.currentTarget.style.boxShadow = 'rgb(46, 115, 0) 0px 10px 0px 0px';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.transition = 'all 0.3s ease';
          }}
        >
          Done
        </button>
      )}
    </div>
  );
}

