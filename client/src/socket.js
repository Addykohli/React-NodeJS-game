import { io } from 'socket.io-client';

// Use environment variable for server URL, fallback to localhost for development
const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
const socket = io(SERVER_URL);

export default socket;
