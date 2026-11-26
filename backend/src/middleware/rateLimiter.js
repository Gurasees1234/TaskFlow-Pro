import { ApiError } from '../utils/ApiError.js';

/**
 * Simple sliding-window in-memory rate limiter middleware.
 */
export const createRateLimiter = ({ windowMs = 60_000, max = 300, message = 'Too many requests, please try again later' } = {}) => {
  const hits = new Map();

  return (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    const record = hits.get(key);

    if (!record || now > record.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(max - 1));
      return next();
    }

    record.count += 1;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - record.count)));

    if (record.count > max) {
      return next(new ApiError(429, message));
    }
    return next();
  };
};

