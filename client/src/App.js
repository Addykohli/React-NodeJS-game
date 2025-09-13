import React, { useContext } from 'react';
import { GameContext } from './context/GameContext';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';
import ErrorBoundary from './components/ErrorBoundary';

const App = () => {
  const { gameState } = useContext(GameContext);
  return (
    <ErrorBoundary>
      {gameState === 'playing' ? <GameScreen /> : <Lobby />}
    </ErrorBoundary>
  );
};

export default App;