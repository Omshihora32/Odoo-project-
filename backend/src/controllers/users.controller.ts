import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, AppError } from '../types';
import { hashPassword } from '../utils/hash';
import { parsePagination, buildPaginationResponse } from '../utils/helpers';
import { logActivity } from '../services/activity.service';

const prisma = new PrismaClient();

export async function getUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, search, sortBy, sortOrder } = req.query as any;
    const { page: p, limit: l, skip } = parsePagination(page, limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          avatar: true,
          country: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          vendor: {
            select: {
              id: true,
              companyName: true,
              status: true,
            },
          },
        },
        skip,
        take: l,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: buildPaginationResponse(total, p, l),
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        avatar: true,
        country: true,
        additionalInfo: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        vendor: true,
      },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, firstName, lastName, phone, role, country, isActive } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('A user with this email already exists.', 409);
    }

    const hashedPassword = await hashPassword(password || 'defaultPass123');

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        role: role || 'VENDOR',
        country: country || null,
        isActive: isActive !== undefined ? isActive : true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        country: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (req.user) {
      await logActivity(req.user.userId, 'CREATE_USER', 'User', user.id, `Created user: ${firstName} ${lastName}`);
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { email, password, firstName, lastName, phone, role, country, isActive, additionalInfo, avatar } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw new AppError('User not found.', 404);
    }

    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (password !== undefined) updateData.password = await hashPassword(password);
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (country !== undefined) updateData.country = country;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (additionalInfo !== undefined) updateData.additionalInfo = additionalInfo;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        avatar: true,
        country: true,
        additionalInfo: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (req.user) {
      await logActivity(req.user.userId, 'UPDATE_USER', 'User', id, `Updated user: ${user.firstName} ${user.lastName}`);
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    // Soft delete by deactivating
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    if (req.user) {
      await logActivity(req.user.userId, 'DELETE_USER', 'User', id, `Deactivated user: ${user.firstName} ${user.lastName}`);
    }

    res.json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
}
