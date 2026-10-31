import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export async function getUserNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;

    const notifications = await prisma.notification.findMany({
      where: { recipientUserId: userId },
      include: {
        course: {
          select: { id: true, code: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        recipientUserId: userId,
        isRead: false,
      },
    });

    res.json({
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('[NotificationController] Get notifications error:', error);
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
}

export async function markNotificationAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const notificationId = req.params.id as string;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    if (notification.recipientUserId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to modify this notification.' });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    res.json({
      message: 'Notification marked as read.',
      notification: updated,
    });
  } catch (error: any) {
    console.error('[NotificationController] Mark read error:', error);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
}

export async function markAllNotificationsAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: {
        recipientUserId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({
      message: 'All notifications marked as read.',
    });
  } catch (error: any) {
    console.error('[NotificationController] Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read.' });
  }
}
