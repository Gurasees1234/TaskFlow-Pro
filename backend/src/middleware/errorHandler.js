import { ZodError } from 'zod';
import { env } from '../config/env.js';

export const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.errors.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid identifier for field "${err.path}"`;
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate resource conflict';
  }

  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  const payload = {
    success: false,
    error: {
      message,
      ...(details ? { details } : {}),
      ...(env.nodeEnv === 'development' && statusCode >= 500 ? { stack: err.stack } : {}),
    },
  };

  res.status(statusCode).json(payload);
};

