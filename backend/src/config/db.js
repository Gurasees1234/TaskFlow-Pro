import mongoose from 'mongoose';
import { env } from './env.js';

const READY_STATE_LABELS = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

let listenersAttached = false;

const attachConnectionListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connected', () => {
    console.info('[db] MongoDB connection established');
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });

  mongoose.connection.on('error', (error) => {
    console.error('[db] MongoDB connection error:', error.message);
  });
};

export const getDatabaseStatus = () => {
  if (!env.mongoUri) {
    return {
      configured: false,
      status: 'not_configured',
    };
  }

  return {
    configured: true,
    status: READY_STATE_LABELS[mongoose.connection.readyState] || 'unknown',
  };
};

export const connectDB = async () => {
  if (!env.mongoUri) {
    console.warn('[db] MONGO_URI is not set. Skipping MongoDB connection.');
    return { connected: false, status: 'not_configured' };
  }

  attachConnectionListeners();

  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    return { connected: true, status: 'connected' };
  } catch (error) {
    console.error('[db] Initial MongoDB connection failed:', error.message);
    return { connected: false, status: 'error', error: error.message };
  }
};

