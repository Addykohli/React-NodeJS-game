import React, { useState, useEffect, useContext, useCallback } from 'react';
import { GameContext } from '../context/GameContext';
import { FaCog, FaSave, FaTimes } from 'react-icons/fa';

const MasterTerminal = ({ onClose }) => {
  const { players, socket } = useContext(GameContext);
  const [edits, setEdits] = useState({});
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [message, setMessage] = useState('');

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === 'master terminal') {
      setAuthenticated(true);
      setMessage('');
    } else {
      setMessage('Incorrect password');
    }
  };

  const handleEditChange = (playerId, field, value) => {
    setEdits(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: field === 'money' || field === 'loan' ? parseInt(value) || 0 : value
      }
    }));
  };

  const handleSaveChanges = useCallback((playerId) => {
    const playerEdits = edits[playerId];
    if (!playerEdits || Object.keys(playerEdits).length === 0) {
      setMessage('No changes to save');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    // Create a clean updates object with only the changed fields
    const player = players.find(p => p.socketId === playerId);
    if (!player) return;
    
    const cleanUpdates = {};
    
    if (playerEdits.money !== undefined && playerEdits.money !== player.money) {
      cleanUpdates.money = parseInt(playerEdits.money) || 0;
    }
    
    if (playerEdits.loan !== undefined && playerEdits.loan !== (player.loan || 0)) {
      cleanUpdates.loan = parseInt(playerEdits.loan) || 0;
    }
    
    if (playerEdits.properties !== undefined) {
      const currentProps = Array.isArray(player.properties) 
        ? player.properties.join(', ') 
        : '';
      if (playerEdits.properties !== currentProps) {
        cleanUpdates.properties = playerEdits.properties;
      }
    }
    
    if (Object.keys(cleanUpdates).length === 0) {
      setMessage('No changes to save');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    setMessage('Saving changes...');
    
    socket.emit('updatePlayer', {
      playerId,
      updates: cleanUpdates
    }, (response) => {
      if (response && response.success) {
        setMessage('Changes saved successfully!');
        // Clear the edits for this player
        setEdits(prev => {
          const newEdits = { ...prev };
          delete newEdits[playerId];
          return newEdits;
        });
      } else {
        setMessage(response?.error || 'Failed to save changes');
      }
      setTimeout(() => setMessage(''), 3000);
    });
  }, [edits, players, socket]);

  if (!authenticated) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.header}>
            <h2><FaCog style={{ marginRight: '10px' }} /> Master Terminal Access</h2>
            <button onClick={onClose} style={styles.closeButton}>
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handlePasswordSubmit} style={styles.form}>
            <div style={{ marginBottom: '20px' }}>
              <label style={styles.label}>Enter Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="master terminal"
                style={styles.input}
                autoFocus
                autoComplete="current-password"
              />
            </div>
            {message && (
              <div style={{
                color: message.includes('Incorrect') ? '#ff4444' : '#4CAF50',
                marginBottom: '15px',
                textAlign: 'center',
                fontSize: '0.9em'
              }}>
                {message}
              </div>
            )}
            <div style={styles.buttonGroup}>
              <button 
                type="button" 
                onClick={onClose}
                style={{
                  ...styles.button,
                  backgroundColor: '#f44336',
                  flex: 1
                }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                style={{
                  ...styles.button,
                  backgroundColor: '#4CAF50',
                  flex: 1
                }}
              >
                Unlock Terminal
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2><FaCog style={{ marginRight: '10px' }} /> Master Terminal</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <FaTimes />
          </button>
        </div>
        
        {message && (
          <div style={{
            backgroundColor: message.includes('success') ? '#4CAF50' : '#2196F3',
            color: 'white',
            padding: '10px',
            borderRadius: '4px',
            margin: '10px 0',
            textAlign: 'center',
            fontSize: '0.9em'
          }}>
            {message}
          </div>
        )}
        
        <div style={styles.playersGrid}>
          {players.map((player) => {
            const hasEdits = Boolean(edits[player.socketId]);
            const playerEdits = edits[player.socketId] || {};
            
            return (
              <div key={player.socketId} style={{
                ...styles.playerCard,
                border: hasEdits ? '2px solid #4CAF50' : '1px solid #444',
                boxShadow: hasEdits ? '0 0 10px rgba(76, 175, 80, 0.5)' : 'none'
              }}>
                <h3 style={{
                  margin: '0 0 15px 0',
                  paddingBottom: '10px',
                  borderBottom: '1px solid #444',
                  color: hasEdits ? '#4CAF50' : '#fff'
                }}>
                  {player.name}
                  {hasEdits && <span style={styles.unsavedBadge}>Unsaved</span>}
                </h3>
                
                <div style={styles.field}>
                  <label style={styles.label}>Money ($):</label>
                  <input
                    type="number"
                    value={playerEdits.money !== undefined ? playerEdits.money : player.money}
                    onChange={(e) => handleEditChange(player.socketId, 'money', e.target.value)}
                    style={styles.input}
                    min="0"
                  />
                </div>
                
                <div style={styles.field}>
                  <label style={styles.label}>Loan ($):</label>
                  <input
                    type="number"
                    value={playerEdits.loan !== undefined ? playerEdits.loan : (player.loan || 0)}
                    onChange={(e) => handleEditChange(player.socketId, 'loan', e.target.value)}
                    style={styles.input}
                    min="0"
                  />
                </div>
                
                <div style={styles.field}>
                  <label style={styles.label}>Properties:</label>
                  <input
                    type="text"
                    value={playerEdits.properties !== undefined 
                      ? playerEdits.properties 
                      : Array.isArray(player.properties) 
                        ? player.properties.join(', ') 
                        : ''}
                    onChange={(e) => handleEditChange(player.socketId, 'properties', e.target.value)}
                    style={styles.input}
                    placeholder="Comma-separated property IDs"
                  />
                </div>
                
                <div style={styles.buttonGroup}>
                  <button 
                    type="button"
                    onClick={() => handleSaveChanges(player.socketId)}
                    style={{
                      ...styles.button,
                      backgroundColor: hasEdits ? '#4CAF50' : '#666',
                      cursor: hasEdits ? 'pointer' : 'not-allowed',
                      flex: 1
                    }}
                    disabled={!hasEdits}
                  >
                    <FaSave style={{ marginRight: '5px' }} />
                    {hasEdits ? 'Save Changes' : 'No Changes'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        <div style={styles.footer}>
          <button 
            onClick={onClose}
            style={{
              ...styles.button,
              backgroundColor: '#f44336',
              marginTop: '20px'
            }}
          >
            Close Terminal
          </button>
        </div>
      </div>
    </div>
  );
};

export default MasterTerminal;

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px',
    backdropFilter: 'blur(5px)'
  },
  modal: {
    backgroundColor: '#1a1a1a',
    color: '#f0f0f0',
    padding: '25px',
    borderRadius: '12px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 5px 30px rgba(0, 0, 0, 0.5)',
    border: '1px solid #333',
    position: 'relative'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '1px solid #333',
    '& h2': {
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      fontSize: '1.5em',
      color: '#4CAF50'
    }
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '5px',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#333',
      color: '#fff'
    }
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
    maxWidth: '400px',
    margin: '0 auto'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#aaa',
    fontSize: '0.9em',
    fontWeight: '500'
  },
  input: {
    width: '100%',
    padding: '12px 15px',
    borderRadius: '6px',
    border: '1px solid #444',
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontSize: '1em',
    transition: 'all 0.2s',
    '&:focus': {
      borderColor: '#4CAF50',
      boxShadow: '0 0 0 2px rgba(76, 175, 80, 0.2)',
      outline: 'none'
    },
    '&::placeholder': {
      color: '#666'
    }
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    color: 'white',
    fontSize: '0.95em',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      opacity: 0.9,
      transform: 'translateY(-1px)'
    },
    '&:active': {
      transform: 'translateY(0)'
    },
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
      transform: 'none'
    }
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px'
  },
  playersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  playerCard: {
    backgroundColor: '#222',
    padding: '20px',
    borderRadius: '10px',
    border: '1px solid #333',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)'
    },
    '& h3': {
      margin: '0 0 15px 0',
      color: '#4CAF50',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '1.2em',
      paddingBottom: '10px',
      borderBottom: '1px solid #333'
    }
  },
  field: {
    marginBottom: '15px',
    '&:last-child': {
      marginBottom: '0'
    }
  },
  unsavedBadge: {
    backgroundColor: '#4CAF50',
    color: 'white',
    fontSize: '0.7em',
    padding: '2px 8px',
    borderRadius: '10px',
    marginLeft: '10px',
    fontWeight: 'normal',
    animation: 'pulse 2s infinite'
  },
  footer: {
    marginTop: '25px',
    paddingTop: '15px',
    borderTop: '1px solid #333',
    display: 'flex',
    justifyContent: 'center'
  },
  '@keyframes pulse': {
    '0%': { opacity: 0.6 },
    '50%': { opacity: 1 },
    '100%': { opacity: 0.6 }
  }
};
