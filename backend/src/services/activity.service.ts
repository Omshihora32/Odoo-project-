import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function logActivity(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: string
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId || null,
        details: details || null,
      },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export async function createNotification(
  userId: string,
  title: string,
  message: string
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}
