import io from 'socket.io-client';

// Use environment variable with fallback for development
const SOCKET_SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

const socket = io(SOCKET_SERVER_URL, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    withCredentials: true,
    transports: ['websocket', 'polling']
});

export default socket;
