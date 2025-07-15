import { prisma } from '../db';
import { PrismaClient, Notification, NotificationType } from '../../generated/prisma';



// Prisma handles ID generation and the service layer defines data structure.

export class NotificationStorage {
  async createNotification(data: {
    teamId: number;
    message: string;
    type: NotificationType;
    linkTo?: string | null;
    // isRead is handled by default in Prisma schema
    // createdAt is handled by default in Prisma schema
  }): Promise<Notification> {
    return prisma.notification.create({
      data: {
        teamId: data.teamId,
        message: data.message,
        type: data.type,
        linkTo: data.linkTo,
        // isRead and createdAt will use Prisma defaults
      },
    });
  }

  async markNotificationRead(notificationId: number): Promise<Notification | null> {
    try {
      return await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true, updatedAt: new Date() }, // Assuming you might want an updatedAt field
      });
    } catch (error) {
      // P2025: Record to update not found
      if ((error as any).code === 'P2025') {
        console.warn(`Notification ${notificationId} not found to mark as read.`);
        return null;
      }
      throw error;
    }
  }

  async markAllNotificationsRead(teamId: number): Promise<{ count: number }> {
    // Prisma's updateMany returns a count of affected records
    return prisma.notification.updateMany({
      where: { 
        teamId: teamId, 
        isRead: false 
      },
      data: { isRead: true, updatedAt: new Date() },
    });
  }

  async getUserNotifications(teamId: number, limit: number = 20, includeRead: boolean = false): Promise<Notification[]> {
    // Changed from userId to teamId to align with Prisma schema and service layer
    return prisma.notification.findMany({
      where: {
        teamId: teamId,
        ...(includeRead ? {} : { isRead: false }), // Conditionally include isRead filter
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  // Additional helper methods can be added here as needed
}

export const notificationStorage = new NotificationStorage();