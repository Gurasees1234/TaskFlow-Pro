import { io } from 'socket.io-client';
import { TOKEN_STORAGE_KEY } from './apiClient';

let socket = null;
let currentProjectId = null;

const resolveSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  if (apiUrl && apiUrl.startsWith('http')) {
    return apiUrl.replace(/\/api\/?$/, '');
  }
  return import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
};

export const connectSocket = () => {
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return null;

  if (socket && socket.connected) {
    return socket;
  }

  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  socket = io(resolveSocketUrl(), {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1500,
  });

  socket.on('connect', () => {
    if (currentProjectId) {
      socket.emit('project:join', currentProjectId);
    }
  });

  return socket;
};

export const joinProjectRoom = (projectId) => {
  if (!projectId) return;
  if (currentProjectId && currentProjectId !== projectId && socket?.connected) {
    socket.emit('project:leave', currentProjectId);
  }
  currentProjectId = projectId;
  if (socket?.connected) {
    socket.emit('project:join', projectId);
  }
};

export const leaveProjectRoom = () => {
  if (currentProjectId && socket?.connected) {
    socket.emit('project:leave', currentProjectId);
  }
  currentProjectId = null;
};

export const disconnectSocket = () => {
  currentProjectId = null;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
