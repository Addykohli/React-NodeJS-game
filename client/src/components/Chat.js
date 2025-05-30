import React, { useState, useEffect, useRef, useContext } from 'react';
import { GameContext } from '../context/GameContext';

const Chat = () => {
  const { socket, player, players } = useContext(GameContext);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    socket.on('chatMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socket.off('chatMessage');
    };
  }, [socket]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket || !player) return;

    socket.emit('chatMessage', {
      sender: player.name,
      content: inputMessage.trim()
    });
    setInputMessage('');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 300px)',
      gap: '15px'
    }}>
      {/* Messages container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '8px',
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {messages.map((msg, index) => (
          <div 
            key={index}
            style={{
              color: 'white',
              fontSize: '1.2em',
              padding: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            <div style={{ 
              color: '#4CAF50', 
              fontWeight: 'bold',
              minWidth: '80px', // Fixed width for name container
              textAlign: 'left' // Changed to left align
            }}>
              [{msg.sender}]
            </div>
            <div style={{
              flex: 1,
              wordBreak: 'break-word', // Ensures long words are broken
              whiteSpace: 'pre-wrap', // Preserves whitespace and wraps text
              lineHeight: '1.4', // Improved line height for readability
              textAlign: 'left' // Explicitly set left alignment
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form 
        onSubmit={handleSendMessage}
        style={{
          display: 'flex',
          gap: '10px'
        }}
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: '12px',
            fontSize: '1.2em',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            color: 'white'
          }}
        />
        <button
          type="submit"
          disabled={!inputMessage.trim()}
          style={{
            padding: '12px 24px',
            fontSize: '1.2em',
            backgroundColor: inputMessage.trim() ? '#4CAF50' : 'rgba(76, 175, 80, 0.3)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: inputMessage.trim() ? 'pointer' : 'not-allowed'
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat; 