import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';

const LeaveGameButton = () => {
  const navigate = useNavigate();
  const socket = useSocket();

  const handleLeaveGame = () => {
    if (window.confirm('Are you sure you want to leave the game? You will not be able to reconnect to this session.')) {
      socket.emit('leaveGame');
      navigate('/'); // Navigate back to home/lobby
    }
  };

  return (
    <button
      onClick={handleLeaveGame}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '10px 20px',
        backgroundColor: '#ff4444',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transition: 'background-color 0.3s ease'
      }}
      onMouseOver={(e) => e.target.style.backgroundColor = '#ff6666'}
      onMouseOut={(e) => e.target.style.backgroundColor = '#ff4444'}
    >
      Leave Game
    </button>
  );
};

export default LeaveGameButton; 