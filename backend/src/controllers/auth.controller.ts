import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, AppError } from '../types';
import { hashPassword, comparePassword } from '../utils/hash';
import { generateToken } from '../utils/jwt';
import { logActivity } from '../services/activity.service';

const prisma = new PrismaClient();

export async function login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { vendor: true },
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Contact admin.', 403);
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password.', 401);
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await logActivity(user.id, 'LOGIN', 'User', user.id, 'User logged in');

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, firstName, lastName, phone, role, country } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('A user with this email already exists.', 409);
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        role: role || 'VENDOR',
        country: country || null,
        vendor: role === 'VENDOR' ? {
          create: {
            companyName: `${firstName} ${lastName} Corp`.trim(),
            contactName: `${firstName} ${lastName}`.trim(),
            email: email,
            phone: phone || '',
            address: 'Registration Address Pending',
            country: country || 'India',
            category: 'OTHER',
            status: 'ACTIVE',
          }
        } : undefined
      },
      include: { vendor: true }
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await logActivity(user.id, 'REGISTER', 'User', user.id, `New user registered: ${firstName} ${lastName}`);

    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { vendor: true },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether email exists
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
      return;
    }

    // In production, generate a reset token and send email
    // For now, we just log the activity
    await logActivity(user.id, 'FORGOT_PASSWORD', 'User', user.id, 'Password reset requested');

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { firstName, lastName, phone, country, additionalInfo, avatar } = req.body;

    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (country !== undefined) updateData.country = country;
    if (additionalInfo !== undefined) updateData.additionalInfo = additionalInfo;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: updateData,
      include: { vendor: true },
    });

    const { password: _, ...userWithoutPassword } = user;

    await logActivity(req.user.userId, 'UPDATE_PROFILE', 'User', user.id, 'Updated profile details');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: userWithoutPassword,
      },
    });
  } catch (error) {
    next(error);
  }
}
