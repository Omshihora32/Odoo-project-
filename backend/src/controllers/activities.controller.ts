import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, AppError } from '../types';
import { parsePagination, buildPaginationResponse } from '../utils/helpers';

const prisma = new PrismaClient();

export async function getActivityLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { page, limit, search } = req.query as any;
    const { page: p, limit: l, skip } = parsePagination(page, limit);

    const where: any = {};
    if (req.user.role === 'VENDOR') {
      where.userId = req.user.userId;
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
        skip,
        take: l,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: buildPaginationResponse(total, p, l),
    });
  } catch (error) {
    next(error);
  }
}

export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { unreadOnly } = req.query as any;
    const where: any = { userId: req.user.userId };
    
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { id } = req.params;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new AppError('Notification not found.', 404);
    if (notification.userId !== req.user.userId) {
      throw new AppError('Access denied.', 403);
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    await prisma.notification.updateMany({
      where: { userId: req.user.userId, isRead: false },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    next(error);
  }
}
