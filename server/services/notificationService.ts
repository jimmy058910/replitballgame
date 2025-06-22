import { storage } from "../storage";
import { randomUUID } from "crypto";

export interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  actionUrl?: string;
  metadata?: any;
}

export class NotificationService {
  static async sendNotification(data: NotificationData) {
    try {
      return await storage.createNotification({
        id: randomUUID(),
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority,
        actionUrl: data.actionUrl || null,
        metadata: data.metadata || null,
        isRead: false,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  static async markAsRead(notificationId: string) {
    return await storage.markNotificationRead(notificationId);
  }

  static async markAllAsRead(userId: string) {
    return await storage.markAllNotificationsRead(userId);
  }

  static async getUserNotifications(userId: string) {
    return await storage.getUserNotifications(userId);
  }
}