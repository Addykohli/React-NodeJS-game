import React, { useContext } from 'react';
import { GameContext } from './context/GameContext';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';

const App = () => {
  const { gameState } = useContext(GameContext);
  return (
    <>
      {gameState === 'playing' ? <GameScreen /> : <Lobby />}
    </>
  );
};

export default App;
