import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import User from '../models/User.js';
import { env } from '../config/env.js';

const generateToken = (user) => {
  if (!env.jwtSecret) {
    throw new ApiError(500, 'JWT_SECRET is not configured on the server');
  }
  return jwt.sign({ id: user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
};

const sanitizeUser = (user) => ({
  id: user._id.toString(),
  _id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  title: user.title || 'Team Member',
  avatarUrl: user.avatarUrl || '',
  notificationPreferences: user.notificationPreferences,
  createdAt: user.createdAt,
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, title } = req.body;
  const exists = await User.findOne({ email: email.trim().toLowerCase() });
  if (exists) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const user = await User.create({
    name,
    email: email.trim().toLowerCase(),
    password,
    role: 'developer',
    title: title || 'Product Contributor',
  });

  const token = generateToken(user);
  res.status(201).json({
    success: true,
    token,
    user: sanitizeUser(user),
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }
  const match = await user.comparePassword(password);
  if (!match) {
    throw new ApiError(401, 'Invalid email or password');
  }
  const token = generateToken(user);
  res.json({
    success: true,
    token,
    user: sanitizeUser(user),
  });
});

export const logout = asyncHandler(async (_req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  res.json({ success: true, user: sanitizeUser(user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const { name, email, title, avatarUrl, notificationPreferences } = req.body;
  if (email && email.trim().toLowerCase() !== user.email) {
    const taken = await User.findOne({
      email: email.trim().toLowerCase(),
      _id: { $ne: user._id },
    });
    if (taken) {
      throw new ApiError(409, 'Email is already in use');
    }
    user.email = email.trim().toLowerCase();
  }
  if (name !== undefined) user.name = name;
  if (title !== undefined) user.title = title;
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
  if (notificationPreferences) {
    user.notificationPreferences = {
      ...user.notificationPreferences?.toObject?.(),
      ...notificationPreferences,
    };
  }

  await user.save();
  res.json({ success: true, user: sanitizeUser(user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  const match = await user.comparePassword(currentPassword);
  if (!match) {
    throw new ApiError(401, 'Current password is incorrect');
  }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated successfully' });
});
