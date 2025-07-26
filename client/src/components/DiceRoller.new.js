import React, { useState, useEffect, useContext } from 'react';
import { GameContext } from '../context/GameContext';
import { tiles } from '../data/tiles';
import { DiceAnimation } from './CasinoDice';
import './DiceRoller.css';

export default function DiceRoller({ testRollMode, hasCasinoPlayed }) {
  const { player, players, currentPlayerId, socket } = useContext(GameContext);
  const [die1, setDie1] = useState(null);
  const [die2, setDie2] = useState(null);
  const [showDice, setShowDice] = useState(false);
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
        setDie1(die1);
        setDie2(die2);
        setShowDice(true);
        setDone(false);
      }
    };

    const onBranchChoices = ({ options }) => setBranchOptions(options);
    const onMovementDone = () => setDone(true);

    const onCasinoResult = ({ playerId }) => {
      if (playerId === player?.socketId) {
        setCasinoPlayed(true);
      }
    };

    socket.on('diceResult', onDiceResult);
    socket.on('branchChoices', onBranchChoices);
    socket.on('movementDone', onMovementDone);
    socket.on('casinoResult', onCasinoResult);
    socket.on('stonePaperScissorsStart', setRpsGame);
    socket.on('stonePaperScissorsResult', () => setRpsGame(null));
    socket.on('stonePaperScissorsTieResolved', () => setRpsGame(null));

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
    setShowDice(false);
    setBranchOptions(null);
  };

  // Don't show the dice roll button if we're showing the 3D animation
  const showRollButton = !showDice && !done && (!hasRolled || testRollMode);
  const showDoneButton = !showDice && (done || hasRolled) && !testRollMode && (!isOnCasino || casinoPlayed) && !rpsGame;

  return (
    <div className="dice-roller-container">
      {showDice && die1 !== null && die2 !== null && (
        <DiceAnimation 
          values={[die1, die2]} 
          onComplete={() => setShowDice(false)}
        />
      )}
      
      <div className="dice-controls">
        {showRollButton && (
          <button
            onClick={handleRoll}
            className={`roll-button ${testRollMode ? 'disabled' : ''}`}
            disabled={testRollMode}
          >
            {testRollMode ? 'Type testroll#' : 'Roll Dice'}
          </button>
        )}

        {showDoneButton && (
          <button
            onClick={handleDone}
            className="done-button"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
