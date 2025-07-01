import React, { useContext, useEffect, useState } from 'react';
import { GameContext } from './context/GameContext';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';

function FullScreenLoading() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.95)',
      color: '#fff',
      fontSize: '2em',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      Connecting to server...
    </div>
  );
}

const App = () => {
  const { socket, players, player } = useContext(GameContext);
  const [socketConnected, setSocketConnected] = useState(false);
  const [playersLoaded, setPlayersLoaded] = useState(false);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // If already connected
    if (socket.connected) setSocketConnected(true);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  useEffect(() => {
    // Wait for players and player to be loaded
    if (players && players.length > 0 && player) {
      setPlayersLoaded(true);
    } else {
      setPlayersLoaded(false);
    }
  }, [players, player]);

  useEffect(() => {
    setAppReady(socketConnected && playersLoaded);
  }, [socketConnected, playersLoaded]);

  if (!appReady) {
    return <FullScreenLoading />;
  }

  return (
    <>
      {gameState === 'playing' ? <GameScreen /> : <Lobby />}
    </>
  );
};

export default App;
