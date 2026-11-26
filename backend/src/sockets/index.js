import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import ProjectMember from '../models/ProjectMember.js';
import { registerIo } from '../utils/socketBus.js';

export const initializeSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    if (!env.jwtSecret) return next(new Error('Server JWT secret not configured'));

    try {
      const decoded = jwt.verify(token, env.jwtSecret);
      socket.userId = String(decoded.id);
      return next();
    } catch {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on('project:join', async (projectId) => {
      if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) return;
      try {
        const isMember = await ProjectMember.exists({
          project: projectId,
          user: socket.userId,
        });
        if (!isMember) {
          socket.emit('socket:error', { message: 'Unauthorized project access' });
          return;
        }
        socket.join(`project:${projectId}`);
      } catch {
        socket.emit('socket:error', { message: 'Failed to join project room' });
      }
    });

    socket.on('project:leave', (projectId) => {
      if (!projectId) return;
      socket.leave(`project:${projectId}`);
    });
  });

  registerIo(io);
  return io;
};
