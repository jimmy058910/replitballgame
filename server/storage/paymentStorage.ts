import { db } from "../db";
import {
    paymentTransactions,
    creditPackages,
    userSubscriptions,
    type PaymentTransaction, type InsertPaymentTransaction,
    type CreditPackage, type InsertCreditPackage,
    type UserSubscription, type InsertUserSubscription
} from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

export class PaymentStorage {

  // PaymentTransaction Operations
  async createPaymentTransaction(txData: Omit<InsertPaymentTransaction, 'id' | 'createdAt'>): Promise<PaymentTransaction> {
    const dataToInsert: InsertPaymentTransaction = {
      id: nanoid(),
      ...txData,
      status: txData.status || 'pending',
      currency: txData.currency || 'usd',
      createdAt: new Date(),
      // completedAt can be null initially
    };
    const [newTx] = await db.insert(paymentTransactions).values(dataToInsert).returning();
    return newTx;
  }

  async getPaymentTransactionById(id: string): Promise<PaymentTransaction | undefined> {
    const [tx] = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, id)).limit(1);
    return tx;
  }

  async getPaymentTransactionByStripeIntentId(stripePaymentIntentId: string): Promise<PaymentTransaction | undefined> {
    const [tx] = await db.select().from(paymentTransactions).where(eq(paymentTransactions.stripePaymentIntentId, stripePaymentIntentId)).limit(1);
    return tx;
  }

  async updatePaymentTransaction(id: string, updates: Partial<Omit<InsertPaymentTransaction, 'id' | 'userId' | 'createdAt'>>): Promise<PaymentTransaction | undefined> {
    const existing = await this.getPaymentTransactionById(id);
    if (!existing) {
        console.warn(`Payment transaction with ID ${id} not found for update.`);
        return undefined;
    }
    // Ensure completedAt is set if status is completed and completedAt is not in updates
    if (updates.status === 'completed' && !updates.completedAt) {
        updates.completedAt = new Date();
    }

    const [updatedTx] = await db.update(paymentTransactions)
      .set(updates) // No automatic updatedAt in schema, handle manually if needed or add to schema
      .where(eq(paymentTransactions.id, id))
      .returning();
    return updatedTx;
  }

  async getUserPaymentHistory(userId: string, limit: number = 20): Promise<PaymentTransaction[]> {
    return await db.select().from(paymentTransactions)
      .where(eq(paymentTransactions.userId, userId))
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(limit);
  }

  // CreditPackage Operations
  async createCreditPackage(packageData: Omit<InsertCreditPackage, 'id' | 'createdAt'>): Promise<CreditPackage> {
    const dataToInsert: InsertCreditPackage = {
      id: nanoid(),
      ...packageData,
      isActive: packageData.isActive === undefined ? true : packageData.isActive,
      createdAt: new Date(),
    };
    const [newPackage] = await db.insert(creditPackages).values(dataToInsert).returning();
    return newPackage;
  }

  async getCreditPackageById(id: string): Promise<CreditPackage | undefined> {
    const [pkg] = await db.select().from(creditPackages).where(eq(creditPackages.id, id)).limit(1);
    return pkg;
  }

  async getActiveCreditPackages(): Promise<CreditPackage[]> {
    return await db.select().from(creditPackages)
      .where(eq(creditPackages.isActive, true))
      .orderBy(asc(creditPackages.price)); // Order by price, for example
  }

  async getAllCreditPackages(): Promise<CreditPackage[]> {
    return await db.select().from(creditPackages).orderBy(asc(creditPackages.price));
  }


  async updateCreditPackage(id: string, updates: Partial<Omit<InsertCreditPackage, 'id' | 'createdAt'>>): Promise<CreditPackage | undefined> {
    const existing = await this.getCreditPackageById(id);
    if (!existing) return undefined;

    const [updatedPackage] = await db.update(creditPackages)
      .set(updates) // No automatic updatedAt in schema
      .where(eq(creditPackages.id, id))
      .returning();
    return updatedPackage;
  }

  // UserSubscription Operations (basic stubs, assuming schema fields)
  async createUserSubscription(subData: Omit<InsertUserSubscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserSubscription> {
    const dataToInsert: InsertUserSubscription = {
      id: nanoid(),
      ...subData,
      status: subData.status || 'pending', // Example default
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const [newSub] = await db.insert(userSubscriptions).values(dataToInsert).returning();
    return newSub;
  }

  async getUserSubscription(userId: string): Promise<UserSubscription | undefined> {
    const [sub] = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      // .orderBy(desc(userSubscriptions.currentPeriodEnd)) // If multiple possible, get latest
      .limit(1);
    return sub;
  }

  async getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | undefined> {
    const [sub] = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId))
      .limit(1);
    return sub;
  }

  async updateUserSubscription(id: string, updates: Partial<Omit<InsertUserSubscription, 'id' | 'userId' | 'createdAt'>>): Promise<UserSubscription | undefined> {
    const existing = await db.select().from(userSubscriptions).where(eq(userSubscriptions.id,id)).limit(1);
    if(!existing[0]) return undefined;

    const [updatedSub] = await db.update(userSubscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userSubscriptions.id, id))
      .returning();
    return updatedSub;
  }
}

export const paymentStorage = new PaymentStorage();
