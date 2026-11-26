import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  title: z.string().trim().max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  title: z.string().trim().max(80).optional(),
  avatarUrl: z.string().trim().max(500).optional(),
  notificationPreferences: z
    .object({
      assignments: z.boolean().optional(),
      mentions: z.boolean().optional(),
      comments: z.boolean().optional(),
      statusChanges: z.boolean().optional(),
      sprintEvents: z.boolean().optional(),
      invitations: z.boolean().optional(),
    })
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(128),
});

