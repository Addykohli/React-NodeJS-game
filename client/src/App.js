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
  const { socket, players, player, gameState } = useContext(GameContext);
  const [socketConnected, setSocketConnected] = useState(false);
  const [playersLoaded, setPlayersLoaded] = useState(false);
  const [appReady, setAppReady] = useState(false);

  // --- NEW: Listen for playersStateUpdate and lobbyUpdate to know when players are ready ---
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);

    // Listen for player state updates from server
    const handlePlayersStateUpdate = (data) => {
      if (data && data.players && data.players.length > 0) {
        setPlayersLoaded(true);
      }
    };
    // Listen for lobby updates (for lobby screen)
    const handleLobbyUpdate = (data) => {
      // Accept empty array as "loaded" for lobby
      if (Array.isArray(data)) {
        setPlayersLoaded(true);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('playersStateUpdate', handlePlayersStateUpdate);
    socket.on('lobbyUpdate', handleLobbyUpdate);

    if (socket.connected) setSocketConnected(true);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('playersStateUpdate', handlePlayersStateUpdate);
      socket.off('lobbyUpdate', handleLobbyUpdate);
    };
  }, [socket]);

  // --- Fallback: If players/player are already present in context, set loaded ---
  useEffect(() => {
    // For lobby, player is enough to consider loaded
    if (player) {
      setPlayersLoaded(true);
    }
  }, [players, player]);

  useEffect(() => {
    setAppReady(socketConnected && playersLoaded);
    if (!(socketConnected && playersLoaded)) {
      // Print readiness state if not ready
      console.log('[App] Not ready:', {
        socketConnected,
        playersLoaded,
        player
      });
    }
  }, [socketConnected, playersLoaded, player]);

  if (!appReady) {
    // Print again in render for extra visibility
    console.log('[App] Still not ready:', {
      socketConnected,
      playersLoaded,
      player
    });
    return <FullScreenLoading />;
  }

  return (
    <>
      {gameState === 'playing' ? <GameScreen /> : <Lobby />}
    </>
  );
};

export default App;
