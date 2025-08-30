import React, { useState, useEffect } from 'react';

const MasterTerminal = ({ players, onClose, onUpdatePlayer, socket }) => {
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
    setEdits(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: field === 'properties' 
          ? value  // Store the raw string value, we'll split it only on save
          : parseInt(value, 10) || 0
      }
    }));
  };

  const handleSaveChanges = (playerId) => {
    const changes = { ...edits[playerId] };
    if (changes) {
      // Process properties field if it exists
      if (changes.properties !== undefined) {
        changes.properties = changes.properties
          .split(',')
          .map(p => p.trim())
          .filter(Boolean);
      }
      
      socket.emit('updatePlayerStats', {
        playerId,
        updates: changes
      });
      
      // Clear the edits for this player
      const newEdits = { ...edits };
      delete newEdits[playerId];
      setEdits(newEdits);
    }
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
