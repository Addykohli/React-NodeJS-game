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
    forceNew: true
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
});

export default socket;
