import io from 'socket.io-client';

// Use environment variable with fallback for development
const SOCKET_SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

const socket = io(SOCKET_SERVER_URL, {
    cors: {
        origin: window.location.origin,
        methods: ["GET", "POST"],
        credentials: true
    },
    withCredentials: true,
    transports: ['websocket', 'polling'], 
    reconnection: true,                  
    reconnectionAttempts: Infinity,      
    reconnectionDelay: 1000,             
    reconnectionDelayMax: 5000,         
    timeout: 20000,                      
    autoConnect: true,
    forceNew: false
});

// Robust connection event handlers for Socket.IO
socket.on('connect', () => {
    console.log('Connected to server');
    // Optionally: re-fetch game state or notify UI
});

socket.on('disconnect', (reason) => {
    console.warn('Disconnected from server:', reason);
    // Always try to reconnect unless user manually disconnected
    if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
        // Socket.IO will auto-reconnect, but can force if needed
        if (!socket.connected) {
            socket.connect();
        }
    }
    // Optionally: show reconnecting UI
});

socket.on('reconnect_attempt', (attempt) => {
    console.log('Reconnection attempt:', attempt);
    // Optionally: show UI feedback
});

socket.on('reconnect', (attempt) => {
    console.log('Successfully reconnected on attempt', attempt);
    // Optionally: re-fetch game state or notify UI
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    // Optionally: show error UI
});


// Add reconnect event handlers
socket.on('reconnect', (attemptNumber) => {
    console.log('Reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('Attempting to reconnect:', attemptNumber);
});

socket.on('reconnect_error', (error) => {
    console.error('Reconnection error:', error);
});

socket.on('reconnect_failed', () => {
    console.error('Failed to reconnect after all attempts');
});

// Periodic ping to server to avoid inactivity disconnects
setInterval(() => {
    if (socket.connected) {
        socket.emit('clientPing');
    }
}, 20000);

export default socket;
