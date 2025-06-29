import { db } from "../db";
import { notifications, type Notification, type InsertNotification } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm"; // Added sql
import { randomUUID } from "crypto";

export class NotificationStorage {
  async createNotification(notificationData: Omit<InsertNotification, 'id' | 'createdAt' | 'isRead' | 'updatedAt'>): Promise<Notification> {
    const dataToInsert: InsertNotification = {
      id: randomUUID(),
      ...notificationData,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Ensure metadata is handled correctly, Drizzle's jsonb should handle objects directly
      metadata: notificationData.metadata || null,
    };
    const [newNotification] = await db.insert(notifications).values(dataToInsert).returning();
    return newNotification;
  }

  async getNotificationById(id: string): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
    return notification;
  }

  async getUserNotifications(userId: string, limit: number = 50, offset: number = 0): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getUnreadUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async countUnreadUserNotifications(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` }) // Ensure count is integer
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result[0]?.count || 0;
  }


  async markNotificationRead(id: string, userId?: string): Promise<Notification | undefined> {
    const conditions = [eq(notifications.id, id)];
    if (userId) {
        conditions.push(eq(notifications.userId, userId));
    }
    const [updatedNotification] = await db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return updatedNotification;
  }

  async markAllNotificationsRead(userId: string): Promise<number> {
    const result = await db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .returning({ id: notifications.id });
    return result.length;
  }

  async deleteNotification(id: string, userId?: string): Promise<boolean> {
    const conditions = [eq(notifications.id, id)];
    if (userId) {
        conditions.push(eq(notifications.userId, userId));
    }
    const result = await db.delete(notifications).where(and(...conditions)).returning({id: notifications.id});
    return result.length > 0;
  }

  async deleteAllUserNotifications(userId: string): Promise<number> { // Renamed for clarity
    const result = await db
      .delete(notifications)
      .where(eq(notifications.userId, userId))
      .returning({id: notifications.id});
    return result.length;
  }
}

export const notificationStorage = new NotificationStorage();
