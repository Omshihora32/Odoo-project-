import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'PROCUREMENT_OFFICER', 'VENDOR', 'MANAGER']).optional(),
  country: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  additionalInfo: z.string().optional(),
  avatar: z.string().optional(),
});
