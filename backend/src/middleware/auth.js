import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import User from '../models/User.js';

export const protect = async (req, _res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Not authorized, token missing'));
  }

  if (!env.jwtSecret) {
    return next(new ApiError(500, 'Authentication service is not configured'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(new ApiError(401, 'User not found'));
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl || '',
    };
    return next();
  } catch {
    return next(new ApiError(401, 'Not authorized, token invalid'));
  }
};

export const authorize = (...roles) => {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden: insufficient role'));
    }
    return next();
  };
};
