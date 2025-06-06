// src/components/Lobby.js
import React, { useContext, useState, useEffect } from 'react';
import { GameContext } from '../context/GameContext';
import bgImage from '../assets/bg.png';

// List of piece images (names should match your /public/pieces folder)
const allPieces = [
  'piece1.png', 'piece2.png', 'piece3.png', 'piece4.png',
  'piece5.png', 'piece6.png', 'piece7.png', 'piece8.png'
];

const Lobby = () => {
  const {
    player,
    setPlayer,
    players = [],
    setPlayers,
    setGameState,
    socket,
    handleQuit
  } = useContext(GameContext);

  const [name, setName] = useState(() => {
    // Initialize name from localStorage if available
    const savedPlayer = localStorage.getItem('gamePlayer');
    return savedPlayer ? JSON.parse(savedPlayer).name : '';
  });
  const [hasJoined, setHasJoined] = useState(() => {
    // Initialize hasJoined based on whether we have a saved player
    return !!localStorage.getItem('gamePlayer');
  });
  const [selectedPiece, setSelectedPiece] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleLobby = updatedPlayers => {
      setPlayers(updatedPlayers || []);
      // sync our local `player` object
      const me = updatedPlayers.find(p => p.socketId === socket.id)
                || (name && updatedPlayers.find(p => p.name === name));
      if (me) {
        setPlayer(me);
        if (me.piece) setSelectedPiece(me.piece);
      }
      console.log('[Lobby.js] lobbyUpdate', updatedPlayers);
    };

    const handleStart = () => {
      setGameState('playing');
      console.log('[Lobby.js] gameStart');
    };

    const handleJoinError = ({ message }) => {
      setError(message);
      setTimeout(() => setError(''), 5000);
    };

    socket.on('lobbyUpdate', handleLobby);
    socket.on('gameStart', handleStart);
    socket.on('joinError', handleJoinError);
    
    return () => {
      socket.off('lobbyUpdate', handleLobby);
      socket.off('gameStart', handleStart);
      socket.off('joinError', handleJoinError);
    };
  }, [socket, name, setPlayers, setPlayer, setSelectedPiece, setGameState]);

  const joinLobby = () => {
    if (!name.trim()) return;
    
    // Check for duplicate name locally before sending to server
    const isDuplicateName = players.some(p => p.name.toLowerCase() === name.toLowerCase());
    if (isDuplicateName) {
      setError('This name is already taken. Please choose another name.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    setHasJoined(true);
    socket.emit('joinLobby', { name });
    console.log('[Lobby.js] joinLobby →', name);
  };

  const choosePiece = piece => {
    setSelectedPiece(piece);
    socket.emit('selectPiece', { piece });
    console.log('[Lobby.js] selectPiece →', piece);
  };

  const handleReady = () => {
    socket.emit('playerReady');
    console.log('[Lobby.js] playerReady');
  };

  const usedPieces = players.map(p => p.piece).filter(Boolean);
  const availablePieces = allPieces.filter(p => !usedPieces.includes(p));

  // find our player in the array
  const thisPlayer = player?.socketId
    ? players.find(p => p.socketId === player.socketId)
    : players.find(p => p.name === player?.name);

  const showReadyButton = !!selectedPiece && thisPlayer && !thisPlayer.ready;

  // If we've picked a piece but server hasn't echoed back our player object yet:
  if (hasJoined && selectedPiece && !thisPlayer) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'white'
      }}>
        <div style={{
          padding: '2rem',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <h2>Business Lobby</h2>
          <p>Joining lobby…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundImage: `url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      color: 'white'
    }}>
      {/* Main content area */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '40px',
        padding: '40px'
      }}>
        {/* Left Box - Join and Setup */}
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '3rem',
          borderRadius: '15px',
          width: '500px'
        }}>
          <h1 style={{ 
            textAlign: 'center', 
            marginBottom: '3rem',
            fontSize: '3em'
          }}>Game Lobby</h1>
          {!hasJoined ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '25px',
              alignItems: 'center'
            }}>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                style={{
                  padding: '20px',
                  fontSize: '1.5rem',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  width: '100%',
                  maxWidth: '400px',
                  outline: 'none'
                }}
              />
              {error && (
                <div style={{
                  color: '#ff6b6b',
                  fontSize: '1.2rem',
                  textAlign: 'center',
                  padding: '15px',
                  backgroundColor: 'rgba(255, 0, 0, 0.1)',
                  borderRadius: '8px',
                  width: '100%',
                  maxWidth: '400px'
                }}>
                  {error}
                </div>
              )}
              <button
                onClick={joinLobby}
                disabled={!name.trim()}
                style={{
                  padding: '20px 40px',
                  fontSize: '1.5rem',
                  backgroundColor: name.trim() ? 'rgba(76, 175, 80, 0.8)' : 'rgba(204, 204, 204, 0.3)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: name.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.3s',
                  width: '100%',
                  maxWidth: '400px'
                }}
              >
                Join Game
              </button>
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '1.2rem',
                textAlign: 'center',
                marginTop: '20px',
                lineHeight: '1.6'
              }}>
                If you were previously in a game and got disconnected,<br />
                enter the same name to reconnect.
              </p>
            </div>
          ) : (
            <>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '30px',
                marginBottom: '30px',
                alignItems: 'center'
              }}>
                <p style={{ fontSize: '1.8rem' }}>Select your game piece:</p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '25px',
                  justifyContent: 'center',
                  width: '100%',
                  maxWidth: '600px'
                }}>
                  {availablePieces.map((piece, idx) => (
                    <div
                      key={idx}
                      style={{
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        padding: '20px',
                        borderRadius: '12px',
                        transition: 'transform 0.2s, background-color 0.2s'
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      }}
                      onClick={() => choosePiece(piece)}
                    >
                      <img
                        src={`/pieces/${piece}`}
                        alt={piece}
                        width={90}
                        height={90}
                        style={{ marginBottom: '10px' }}
                      />
                      <div style={{ fontSize: '1.2rem' }}>{piece.replace('.png', '')}</div>
                    </div>
                  ))}
                </div>
              </div>
              {selectedPiece && (
                <div style={{
                  textAlign: 'center',
                  marginTop: '30px',
                  padding: '25px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px'
                }}>
                  <p style={{ 
                    marginBottom: '20px',
                    fontSize: '1.6rem'
                  }}>
                    Welcome, <strong>{thisPlayer.name}</strong>! You've selected:
                    <img
                      src={`/pieces/${selectedPiece}`}
                      alt=""
                      width={45}
                      style={{ marginLeft: '15px', verticalAlign: 'middle' }}
                    />
                  </p>
                  {showReadyButton && (
                    <button
                      onClick={handleReady}
                      style={{
                        padding: '20px 40px',
                        fontSize: '1.5rem',
                        backgroundColor: 'rgba(76, 175, 80, 0.8)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'background-color 0.3s'
                      }}
                    >
                      Ready
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Box - Players List */}
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '3rem',
          borderRadius: '15px',
          width: '500px'
        }}>
          <h2 style={{ 
            textAlign: 'center', 
            marginBottom: '2rem',
            fontSize: '2.2rem'
          }}>Players in Lobby</h2>
          <ul style={{
            listStyle: 'none',
            padding: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            {players.map((p, i) => (
              <li
                key={i}
                style={{
                  padding: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '15px',
                  fontSize: '1.6rem'
                }}
              >
                <span>{p.name}</span>
                {p.piece && (
                  <img
                    src={`/pieces/${p.piece}`}
                    alt=""
                    width={36}
                    height={36}
                    style={{ verticalAlign: 'middle' }}
                  />
                )}
                {p.ready && (
                  <span style={{
                    color: '#4CAF50',
                    fontSize: '1.8rem'
                  }}>✓</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        padding: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {hasJoined && (
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to quit? This will remove you from the lobby.')) {
                socket.emit('quitGame');
                handleQuit();
              }
            }}
            style={{
              padding: '15px 30px',
              fontSize: '1.2rem',
              backgroundColor: 'rgba(244, 67, 54, 0.8)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
          >
            Quit Game
          </button>
        )}
      </div>
    </div>
  );
};

export default Lobby;
