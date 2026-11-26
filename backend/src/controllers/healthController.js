import { getHealthStatus } from '../services/healthService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const checkHealth = asyncHandler(async (_req, res) => {
  const data = getHealthStatus();

  res.status(200).json({
    success: true,
    ...data,
  });
});

