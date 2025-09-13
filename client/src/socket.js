import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

let socket;
let pingInterval;

const createSocket = () => {
  // Clean up existing socket if it exists
  if (socket) {
    socket.off();
    if (socket.connected) {
      socket.disconnect();
    }
    clearInterval(pingInterval);
  }

  // Create new socket instance
  socket = io(SOCKET_SERVER_URL, {
    cors: {
      origin: window.location.origin,
      methods: ["GET", "POST"],
      credentials: true
    },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    autoConnect: true,
    forceNew: true
  });

  // Connection handlers
  const onConnect = () => {
    console.log('Connected to server');
    localStorage.removeItem('socketConnectionError');
    
    // Set up ping interval when connected
    clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('clientPing');
      }
    }, 20000);
  };

  const onDisconnect = (reason) => {
    console.warn('Disconnected from server:', reason);
    if (reason === 'io server disconnect' || 
        reason === 'transport close' || 
        reason === 'ping timeout') {
      localStorage.setItem('socketConnectionError', 'disconnected');
    }
  };

  const onReconnectAttempt = (attempt) => {
    console.log('Reconnection attempt:', attempt);
  };

  const onReconnect = (attempt) => {
    console.log('Successfully reconnected on attempt', attempt);
    localStorage.removeItem('socketConnectionError');
  };

  const onConnectError = (error) => {
    console.error('Connection error:', error);
    localStorage.setItem('socketConnectionError', 'connect_error');
  };

  const onReconnectFailed = () => {
    console.error('Failed to reconnect after all attempts');
  };

  // Set up event listeners
  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);
  socket.on('reconnect_attempt', onReconnectAttempt);
  socket.on('reconnect', onReconnect);
  socket.on('connect_error', onConnectError);
  socket.on('reconnect_failed', onReconnectFailed);

  // Cleanup function
  return () => {
    clearInterval(pingInterval);
    socket.off('connect', onConnect);
    socket.off('disconnect', onDisconnect);
    socket.off('reconnect_attempt', onReconnectAttempt);
    socket.off('reconnect', onReconnect);
    socket.off('connect_error', onConnectError);
    socket.off('reconnect_failed', onReconnectFailed);
  };
};

// Initialize socket on first import
createSocket();

// Export a function to get the socket instance
const getSocket = () => {
  if (!socket || !socket.connected) {
    createSocket();
  }
  return socket;
};

export { getSocket };
export default getSocket();
