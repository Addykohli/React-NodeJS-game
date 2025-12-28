import io from 'socket.io-client';

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

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', (reason) => {
    console.warn('Disconnected from server:', reason);
});

socket.on('reconnect_attempt', (attempt) => {
    console.log('Reconnection attempt:', attempt);
});

socket.on('reconnect', (attempt) => {
    console.log('Successfully reconnected on attempt', attempt);
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
});

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

setInterval(() => {
    if (socket.connected) {
        socket.emit('clientPing');
    }
}, 20000);

export default socket;
