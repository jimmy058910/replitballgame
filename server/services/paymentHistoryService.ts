import { prisma } from "../db";
import type { PaymentTransaction, InsertPaymentTransaction } from "../../shared/schema";

export class PaymentHistoryService {
  /**
   * Record a new payment transaction
   */
  static async recordTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction> {
    const [newTransaction] = await db
      .insert(paymentTransactions)
      .values({
        ...transaction,
        completedAt: transaction.status === "completed" ? new Date() : null,
      })
      .returning();
    
    return newTransaction;
  }

  /**
   * Get payment history for a user with optional filtering
   */
  static async getUserPaymentHistory(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      currencyFilter?: "credits" | "gems" | "both";
      transactionType?: string;
      status?: string;
    } = {}
  ): Promise<{
    transactions: PaymentTransaction[];
    total: number;
  }> {
    const {
      limit = 50,
      offset = 0,
      currencyFilter = "both",
      transactionType,
      status
    } = options;

    // Build where conditions
    const conditions = [eq(paymentTransactions.userId, userId)];

    // Currency filter - simplified for now
    // if (currencyFilter === "credits") {
    //   conditions.push(ne(paymentTransactions.creditsChange, 0));
    // } else if (currencyFilter === "gems") {
    //   conditions.push(ne(paymentTransactions.gemsChange, 0));
    // }

    // Transaction type filter
    if (transactionType) {
      conditions.push(eq(paymentTransactions.transactionType, transactionType));
    }

    // Status filter
    if (status) {
      conditions.push(eq(paymentTransactions.status, status));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Get transactions with pagination
    const transactions = await db
      .select()
      .from(paymentTransactions)
      .where(whereClause)
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count (simplified)
    const totalCount = transactions.length;

    return {
      transactions,
      total: Number(totalCount) || 0,
    };
  }

  /**
   * Get team payment history (for team-specific purchases)
   */
  static async getTeamPaymentHistory(
    teamId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<PaymentTransaction[]> {
    const { limit = 50, offset = 0 } = options;

    return await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.teamId, teamId))
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Update transaction status
   */
  static async updateTransactionStatus(
    transactionId: string,
    status: string,
    failureReason?: string
  ): Promise<PaymentTransaction | null> {
    const [updatedTransaction] = await db
      .update(paymentTransactions)
      .set({
        status,
        failureReason,
        completedAt: status === "completed" ? new Date() : null,
      })
      .where(eq(paymentTransactions.id, transactionId))
      .returning();

    return updatedTransaction || null;
  }

  /**
   * Get transaction summary for a user
   */
  static async getUserTransactionSummary(userId: string): Promise<{
    totalCreditsEarned: number;
    totalCreditsSpent: number;
    totalGemsEarned: number;
    totalGemsSpent: number;
    totalTransactions: number;
    totalSpentUSD: number;
  }> {
    const transactions = await db
      .select()
      .from(paymentTransactions)
      .where(and(
        eq(paymentTransactions.userId, userId),
        eq(paymentTransactions.status, "completed")
      ));

    const summary = transactions.reduce(
      (acc, transaction) => {
        // Credits
        if (transaction.creditsChange && transaction.creditsChange > 0) {
          acc.totalCreditsEarned += transaction.creditsChange;
        } else if (transaction.creditsChange && transaction.creditsChange < 0) {
          acc.totalCreditsSpent += Math.abs(transaction.creditsChange);
        }

        // Gems
        if (transaction.gemsChange && transaction.gemsChange > 0) {
          acc.totalGemsEarned += transaction.gemsChange;
        } else if (transaction.gemsChange && transaction.gemsChange < 0) {
          acc.totalGemsSpent += Math.abs(transaction.gemsChange);
        }

        // USD spending
        if (transaction.amount && transaction.amount > 0) {
          acc.totalSpentUSD += transaction.amount;
        }

        acc.totalTransactions++;
        
        return acc;
      },
      {
        totalCreditsEarned: 0,
        totalCreditsSpent: 0,
        totalGemsEarned: 0,
        totalGemsSpent: 0,
        totalTransactions: 0,
        totalSpentUSD: 0,
      }
    );

    return summary;
  }

  /**
   * Helper method to record common transaction types
   */
  static async recordItemPurchase(
    userId: string,
    teamId: string | null,
    itemName: string,
    itemType: string,
    creditsSpent: number = 0,
    gemsSpent: number = 0,
    metadata?: any
  ): Promise<PaymentTransaction> {
    return this.recordTransaction({
      userId,
      teamId,
      transactionType: "purchase",
      itemType,
      itemName,
      creditsChange: creditsSpent > 0 ? -creditsSpent : 0,
      gemsChange: gemsSpent > 0 ? -gemsSpent : 0,
      status: "completed",
      paymentMethod: "system",
      metadata,
    });
  }

  /**
   * Record admin credit/gem grants
   */
  static async recordAdminGrant(
    userId: string,
    teamId: string | null,
    creditsGranted: number = 0,
    gemsGranted: number = 0,
    reason: string = "Admin Grant"
  ): Promise<PaymentTransaction> {
    return this.recordTransaction({
      userId,
      teamId,
      transactionType: "admin_grant",
      itemType: creditsGranted > 0 ? "credits" : "gems",
      itemName: reason,
      creditsChange: creditsGranted,
      gemsChange: gemsGranted,
      status: "completed",
      paymentMethod: "admin",
    });
  }

  /**
   * Record reward transactions (from ads, achievements, etc.)
   */
  static async recordReward(
    userId: string,
    teamId: string | null,
    rewardType: string,
    creditsEarned: number = 0,
    gemsEarned: number = 0
  ): Promise<PaymentTransaction> {
    return this.recordTransaction({
      userId,
      teamId,
      transactionType: "reward",
      itemType: creditsEarned > 0 ? "credits" : "gems",
      itemName: `${rewardType} Reward`,
      creditsChange: creditsEarned,
      gemsChange: gemsEarned,
      status: "completed",
      paymentMethod: "reward",
    });
  }
}