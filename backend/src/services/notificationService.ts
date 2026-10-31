import { prisma } from '../config/db.js';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationParams {
  recipientUserId: string;
  courseId?: string | null;
  title: string;
  message: string;
  type?: NotificationType;
  relatedResourceId?: string | null;
  linkUrl?: string | null;
}

/**
 * Create a single notification for a specific recipient
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    return await prisma.notification.create({
      data: {
        recipientUserId: params.recipientUserId,
        courseId: params.courseId || null,
        title: params.title,
        message: params.message,
        type: params.type || NotificationType.GENERAL,
        relatedResourceId: params.relatedResourceId || null,
        linkUrl: params.linkUrl || null,
      },
    });
  } catch (error) {
    console.error('[NotificationService] Error creating notification:', error);
    return null;
  }
}

/**
 * Notify all students enrolled in a specific course
 */
export async function notifyEnrolledStudents(
  courseId: string,
  params: {
    title: string;
    message: string;
    type?: NotificationType;
    relatedResourceId?: string | null;
    linkUrl?: string | null;
  }
) {
  try {
    const studentEnrollments = await prisma.enrollment.findMany({
      where: {
        courseId,
        role: 'STUDENT',
      },
      select: { userId: true },
    });

    if (studentEnrollments.length === 0) return [];

    const notificationsData = studentEnrollments.map((enr) => ({
      recipientUserId: enr.userId,
      courseId,
      title: params.title,
      message: params.message,
      type: params.type || NotificationType.GENERAL,
      relatedResourceId: params.relatedResourceId || null,
      linkUrl: params.linkUrl || null,
    }));

    await prisma.notification.createMany({
      data: notificationsData,
    });

    console.log(
      `[NotificationService] Dispatched '${params.title}' notification to ${studentEnrollments.length} enrolled students in course ${courseId}.`
    );
    return notificationsData;
  } catch (error) {
    console.error('[NotificationService] Error notifying enrolled students:', error);
    return [];
  }
}

/**
 * Notify all professors teaching a specific course
 */
export async function notifyCourseProfessors(
  courseId: string,
  params: {
    title: string;
    message: string;
    type?: NotificationType;
    relatedResourceId?: string | null;
    linkUrl?: string | null;
  }
) {
  try {
    const professorEnrollments = await prisma.enrollment.findMany({
      where: {
        courseId,
        role: { in: ['PROFESSOR', 'ADMIN'] },
      },
      select: { userId: true },
    });

    if (professorEnrollments.length === 0) return [];

    const notificationsData = professorEnrollments.map((enr) => ({
      recipientUserId: enr.userId,
      courseId,
      title: params.title,
      message: params.message,
      type: params.type || NotificationType.GENERAL,
      relatedResourceId: params.relatedResourceId || null,
      linkUrl: params.linkUrl || null,
    }));

    await prisma.notification.createMany({
      data: notificationsData,
    });

    console.log(
      `[NotificationService] Dispatched '${params.title}' notification to ${professorEnrollments.length} professors for course ${courseId}.`
    );
    return notificationsData;
  } catch (error) {
    console.error('[NotificationService] Error notifying course professors:', error);
    return [];
  }
}
