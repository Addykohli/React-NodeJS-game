import React, { useState, useEffect, useRef, useContext } from 'react';
import { GameContext } from '../context/GameContext';

if (typeof document !== 'undefined' && !document.getElementById('chat-send-style')) {
  const style = document.createElement('style');
  style.id = 'chat-send-style';
  style.innerHTML = `
    button.chat-send {
      font-family: inherit;
      font-size: 20px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 0.7em 1em;
      padding-left: 0.9em;
      display: flex;
      align-items: center;
      border: none;
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.2s;
      cursor: pointer;
    }
    button.chat-send span {
      display: block;
      margin-left: 0.3em;
      transition: all 0.3s ease-in-out;
    }
    button.chat-send svg {
      display: block;
      transform-origin: center center;
      transition: transform 0.3s ease-in-out;
    }
    button.chat-send:hover .svg-wrapper {
      animation: fly-1 0.6s ease-in-out infinite alternate;
    }
    button.chat-send:hover svg {
      transform: translateX(1.2em) rotate(45deg) scale(1.1);
    }
    button.chat-send:hover span {
      transform: translateX(5em);
    }
    button.chat-send:active {
      transform: scale(0.95);
    }
    @keyframes fly-1 {
      from {
        transform: translateY(0.1em);
      }
      to {
        transform: translateY(-0.1em);
      }
    }
  `;
  document.head.appendChild(style);
}


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
      height: 'calc(100vh - 400px)',
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
              fontSize: '2em',
              padding: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            <div style={{ 
              color: '#4CAF50', 
              fontWeight: 'bold',
              minWidth: '80px', 
              textAlign: 'left' 
            }}>
              [{msg.sender}]
            </div>
            <div style={{
              flex: 1,
              wordBreak: 'break-word', 
              whiteSpace: 'pre-wrap', 
              lineHeight: '1.4', 
              textAlign: 'left' 
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
          flexDirection: 'column',
          gap: 0,
          marginTop: '8px'
        }}
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type a message..."
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '2em',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: 'white',
            marginBottom: '12px',
            boxSizing: 'border-box'
          }}
        />
        <button
          className="chat-send"
          type="submit"
          disabled={!inputMessage.trim()}
          style={{
            alignSelf: 'center',
            opacity: inputMessage.trim() ? 1 : 0.6,
            pointerEvents: inputMessage.trim() ? 'auto' : 'none',
            marginTop: 0
          }}
        >
          <span className="svg-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
            <svg height="24" width="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor"/>
            </svg>
          </span>
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};

export default Chat; 