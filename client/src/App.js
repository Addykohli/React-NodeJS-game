import React, { useContext, useEffect, useState } from 'react';
import { GameContext } from './context/GameContext';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';

function FullScreenLoading({ debugMsg }) {
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
      left: 0,
      flexDirection: 'column'
    }}>
      Connecting to server...
      {debugMsg && (
        <div style={{ fontSize: '0.6em', marginTop: '2em', color: '#aaa' }}>
          {debugMsg}
        </div>
      )}
    </div>
  );
}

function App() {
  const { socket, players, player } = useContext(GameContext);
  const [socketConnected, setSocketConnected] = useState(false);
  const [playersLoaded, setPlayersLoaded] = useState(false);
  const [appReady, setAppReady] = useState(false);

  // Track what is missing for debug
  const [waitingFor, setWaitingFor] = useState([]);

  // Listen for socket connection/disconnection
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) setSocketConnected(true);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  // Listen for lobbyUpdate and playersStateUpdate to know when players are ready
  useEffect(() => {
    if (!socket) return;

    const handleLobbyUpdate = (data) => {
      if ((Array.isArray(data) && data.length > 0) ||
          (data && data.players && data.players.length > 0)) {
        setPlayersLoaded(true);
      }
    };
    const handlePlayersStateUpdate = (data) => {
      if (data && data.players && data.players.length > 0) {
        setPlayersLoaded(true);
      }
    };

    socket.on('lobbyUpdate', handleLobbyUpdate);
    socket.on('playersStateUpdate', handlePlayersStateUpdate);

    // If already loaded in context, set immediately
    if ((players && players.length > 0) || (player && player.name)) {
      setPlayersLoaded(true);
    }

    return () => {
      socket.off('lobbyUpdate', handleLobbyUpdate);
      socket.off('playersStateUpdate', handlePlayersStateUpdate);
    };
  }, [socket, players, player]);

  // Fallback: If players/player are already present in context, set loaded
  useEffect(() => {
    if ((players && players.length > 0) || (player && player.name)) {
      setPlayersLoaded(true);
    }
  }, [players, player]);

  // Track what is missing and print to console
  useEffect(() => {
    const missing = [];
    if (!socketConnected) missing.push('socket');
    if (!playersLoaded) missing.push('players');
    setWaitingFor(missing);
    if (missing.length > 0) {
      console.log('[App] Waiting for:', missing.join(', '));
    }
  }, [socketConnected, playersLoaded]);

  useEffect(() => {
    setAppReady(socketConnected && playersLoaded);
  }, [socketConnected, playersLoaded]);

  if (!appReady) {
    return <FullScreenLoading debugMsg={waitingFor.length ? `Waiting for: ${waitingFor.join(', ')}` : ''} />;
  }

  return (
    <>
      {gameState === 'playing' ? <GameScreen /> : <Lobby />}
    </>
  );
};

export default App;
