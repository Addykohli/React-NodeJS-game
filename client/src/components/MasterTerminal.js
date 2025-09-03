import React, { useState, useEffect } from 'react';
import { tiles } from '../data/tiles';

const MasterTerminal = ({ players: initialPlayers, onClose, onUpdatePlayer, socket }) => {
  const [players, setPlayers] = useState(initialPlayers);

  useEffect(() => {
    setPlayers(initialPlayers);
  }, [initialPlayers]);
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [edits, setEdits] = useState({});

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === 'master termianl') {
      setAuthenticated(true);
    } else {
      alert('Incorrect password!');
      setPassword('');
    }
  };

  const handleInputChange = (playerId, field, value) => {
    setEdits(prev => {
      const newValue = field === 'properties' 
        ? value  
        : value === '' ? '' : Number(value);
      
      return {
        ...prev,
        [playerId]: {
          ...prev[playerId],
          [field]: newValue
        }
      };
    });
  };


  useEffect(() => {
    const handlePlayerStatsUpdated = ({ playerId, updates }) => {
      console.log('=== Client: Received Player Update ===');
      console.log('Player ID:', playerId);
      console.log('Updates:', {
        ...updates,
        propertiesType: Array.isArray(updates.properties) ? 'array' : typeof updates.properties,
        propertiesLength: Array.isArray(updates.properties) ? updates.properties.length : 'N/A'
      });
      
      setPlayers(prevPlayers => {
        const updatedPlayers = prevPlayers.map(player => 
          player.socketId === playerId 
            ? { ...player, ...updates }
            : player
        );
        
        const updatedPlayer = updatedPlayers.find(p => p.socketId === playerId);
        if (updatedPlayer) {
          console.log('=== Client: Updated Player in Context ===');
          console.log('Player:', {
            id: updatedPlayer.socketId,
            name: updatedPlayer.name,
            properties: updatedPlayer.properties,
            propertiesType: Array.isArray(updatedPlayer.properties) ? 'array' : typeof updatedPlayer.properties,
            propertiesLength: Array.isArray(updatedPlayer.properties) ? updatedPlayer.properties.length : 'N/A'
          });
        }
        
        return updatedPlayers;
      });
    };

    socket.on('playerStatsUpdated', handlePlayerStatsUpdated);
    return () => {
      socket.off('playerStatsUpdated', handlePlayerStatsUpdated);
    };
  }, [socket]);

  const handleSaveChanges = (playerId) => {
    const player = players.find(p => p.socketId === playerId);
    if (!player) return;
    
    const currentEdits = edits[playerId] || {};
    
    const changes = {};
    
    if (currentEdits.money !== undefined) {
      changes.money = currentEdits.money === '' ? 0 : Number(currentEdits.money);
    }
    
    if (currentEdits.loan !== undefined) {
      changes.loan = currentEdits.loan === '' ? 0 : Number(currentEdits.loan);
    }
    
    changes.properties = [...(player.properties || [])];
    
    if (currentEdits.properties !== undefined) {
      changes.properties = (typeof currentEdits.properties === 'string' 
        ? currentEdits.properties
            .split(',')
            .map(p => parseInt(p.trim(), 10))
            .filter(n => !isNaN(n))
        : Array.isArray(currentEdits.properties) 
          ? currentEdits.properties.map(p => parseInt(p, 10)).filter(n => !isNaN(n))
          : []
      ).filter(num => {
        const tile = tiles.find(t => t.id === num);
        return tile && tile.type === 'property';
      });
      
      console.log('Filtered properties:', changes.properties);
    }
    
    socket.emit('updatePlayerStats', {
      playerId,
      updates: changes
    });
    
    const newEdits = { ...edits };
    delete newEdits[playerId];
    setEdits(newEdits);
  };

  if (!authenticated) {
    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modalContent}>
          <h3>Master Terminal Access</h3>
          <form onSubmit={handlePasswordSubmit} style={styles.form}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={styles.input}
              autoFocus
            />
            <div style={styles.buttonGroup}>
              <button type="submit" style={styles.submitButton}>
                Submit
              </button>
              <button 
                type="button" 
                onClick={onClose}
                style={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={{...styles.modalContent, maxWidth: '800px', maxHeight: '80vh'}}>
        <div style={styles.header}>
          <h3>Master Terminal</h3>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>
        <div style={styles.playersGrid}>
          {players.map((player) => (
            <div key={player.socketId} style={styles.playerCard}>
              <h4>{player.name}</h4>
              <div style={styles.formGroup}>
                <label>Money:</label>
                <input
                  type="number"
                  value={edits[player.socketId]?.money ?? player.money}
                  onChange={(e) => handleInputChange(player.socketId, 'money', e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label>Loan:</label>
                <input
                  type="number"
                  value={edits[player.socketId]?.loan ?? (player.loan || 0)}
                  onChange={(e) => handleInputChange(player.socketId, 'loan', e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label>Properties (comma-separated):</label>
                <input
                  type="text"
                  value={edits[player.socketId]?.properties ?? (player.properties?.join(', ') || '')}
                  onChange={(e) => handleInputChange(player.socketId, 'properties', e.target.value)}
                  style={styles.input}
                />
              </div>
              <button 
                onClick={() => handleSaveChanges(player.socketId)}
                disabled={!edits[player.socketId]}
                style={edits[player.socketId] ? styles.saveButton : styles.saveButtonDisabled}
              >
                Save Changes
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    padding: '20px',
    borderRadius: '10px',
    width: '90%',
    maxWidth: '500px',
    color: '#fff',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  input: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #444',
    backgroundColor: '#333',
    color: '#fff',
    width: '100%',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
  },
  submitButton: {
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0 10px',
  },
  playersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    maxHeight: '60vh',
    overflowY: 'auto',
    padding: '10px',
  },
  playerCard: {
    backgroundColor: '#2a2a2a',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #444',
  },
  formGroup: {
    marginBottom: '15px',
  },
  saveButton: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  saveButtonDisabled: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#666',
    color: '#999',
    border: 'none',
    borderRadius: '4px',
    cursor: 'not-allowed',
  },
};

export default MasterTerminal;
