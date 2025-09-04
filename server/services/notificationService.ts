import { getPrismaClient } from "../database.js";
import { randomUUID } from "crypto";
import { NotificationType } from "../db";

export interface NotificationData {
  teamId: number;
  type: NotificationType;
  message: string;
  linkTo?: string;
}

export class NotificationService {
  static async sendNotification(data: NotificationData) {
    const prisma = await getPrismaClient();
    try {
      return await prisma.notification.create({
        data: {
          teamId: data.teamId,
          type: data.type,
          message: data.message,
          linkTo: data.linkTo || null,
          isRead: false,
        }
      });
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  static async markAsRead(notificationId: number) {
    const prisma = await getPrismaClient();
    return await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
  }

  static async markAllAsRead(teamId: number) {
    const prisma = await getPrismaClient();
    return await prisma.notification.updateMany({
      where: { teamId, isRead: false },
      data: { isRead: true }
    });
  }

  static async getUserNotifications(teamId: number) {
    return await prisma.notification.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' }
    });
  }
}