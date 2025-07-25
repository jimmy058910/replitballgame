import { prisma } from "../db";
import { randomUUID } from "crypto";

export interface NotificationData {
  teamId: number;
  type: string;
  message: string;
  linkTo?: string;
}

export class NotificationService {
  static async sendNotification(data: NotificationData) {
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
    return await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
  }

  static async markAllAsRead(teamId: number) {
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