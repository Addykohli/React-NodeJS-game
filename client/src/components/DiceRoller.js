import React, { useState, useEffect, useContext } from 'react';
import { GameContext } from '../context/GameContext';
import { tiles } from '../data/tiles';
import Dice3D from './Dice3D';

export default function DiceRoller({ testRollMode, hasCasinoPlayed }) {
  const { player, players, currentPlayerId, socket } = useContext(GameContext);
  const [die1, setDie1] = useState(null);
  const [die2, setDie2] = useState(null);
  const [showDice, setShowDice] = useState(false);
  const [diceValues, setDiceValues] = useState({ die1: null, die2: null });
  const [done, setDone] = useState(false);
  const [rpsGame, setRpsGame] = useState(null);
  const [branchOptions, setBranchOptions] = useState(null);
  const [casinoPlayed, setCasinoPlayed] = useState(hasCasinoPlayed);

  const tileMeta = tiles.find(t => t.id === player?.tileId);

  const isOnCasino = tileMeta?.id === 16;

  
  useEffect(() => {
    setCasinoPlayed(hasCasinoPlayed);
  }, [hasCasinoPlayed]);

  useEffect(() => {
    const onDiceResult = ({ playerId, die1, die2 }) => {
      if (playerId === player?.socketId) {
        setDiceValues({ die1, die2 });
        setShowDice(true);
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

      {showDice && (
        <>
          <Dice3D 
            value={diceValues.die1} 
            position="left" 
            onAnimationEnd={() => {
              // Only hide after both dice have finished animating
              if (!showDice) return;
              setShowDice(false);
            }}
          />
          <Dice3D 
            value={diceValues.die2} 
            position="right"
            onAnimationEnd={() => {
              // Only hide after both dice have finished animating
              if (!showDice) return;
              setShowDice(false);
            }}
          />
        </>
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

