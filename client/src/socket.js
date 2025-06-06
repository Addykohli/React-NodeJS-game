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
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    autoConnect: true,
    forceNew: false,
    reconnection: true
});

// Add connection event handlers
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    if (reason === 'io server disconnect' || reason === 'transport close') {
        socket.connect();
    }
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

export default socket;
