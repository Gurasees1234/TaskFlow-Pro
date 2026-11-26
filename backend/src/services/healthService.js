import { env } from '../config/env.js';
import { getDatabaseStatus } from '../config/db.js';

export const getHealthStatus = () => ({
  status: 'ok',
  service: 'taskflow-pro-api',
  version: '1.0.0',
  environment: env.nodeEnv,
  uptimeSeconds: Number(process.uptime().toFixed(2)),
  timestamp: new Date().toISOString(),
  database: getDatabaseStatus(),
});

