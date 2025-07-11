import { db } from '../db';
import { PrismaClient, Notification, NotificationType } from '../../generated/prisma';
import { db } from '../db';

const prisma = db; // Use the shared Prisma instance

// The old NotificationData interface and randomUUID are no longer needed
// as Prisma handles ID generation and the service layer defines data structure.

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

  // Method for fetching by old string UUID user_id (if needed during transition, but ideally remove)
  // async getNotificationsByDrizzleUserId(drizzleUserId: string, limit: number = 20): Promise<Notification[]> {
  //   console.warn("Attempting to fetch notifications by Drizzle user ID, this may not work if UserProfile link is missing or different.");
  //   // This is problematic as Notification is linked to Team (Int ID), which is linked to UserProfile (Int ID)
  //   // A direct lookup from userId (string) to Prisma Notification requires joining through UserProfile -> Team.
  //   // For now, this function will likely fail or return empty if not adapted further.
  //   const userProfile = await prisma.userProfile.findUnique({ where: { userId: drizzleUserId }});
  //   if (!userProfile) return [];
  //   const team = await prisma.team.findUnique({ where: { userProfileId: userProfile.id }});
  //   if (!team) return [];
  //   return this.getUserNotifications(team.id, limit);
  // }
}

export const notificationStorage = new NotificationStorage();