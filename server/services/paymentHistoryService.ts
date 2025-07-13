import { prisma } from "../db";
import type { PaymentTransaction, InsertPaymentTransaction } from "../../shared/schema";

export class PaymentHistoryService {
  /**
   * Record a new payment transaction
   */
  static async recordTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction> {
    const newTransaction = await prisma.paymentTransaction.create({
      data: {
        ...transaction,
        completedAt: transaction.status === "completed" ? new Date() : null,
      }
    });
    
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
    const whereConditions: any = { userId };

    // Transaction type filter
    if (transactionType) {
      whereConditions.transactionType = transactionType;
    }

    // Status filter
    if (status) {
      whereConditions.status = status;
    }

    // Get transactions with pagination
    const transactions = await prisma.paymentTransaction.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Get total count
    const totalCount = await prisma.paymentTransaction.count({
      where: whereConditions,
    });

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

    return await prisma.paymentTransaction.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Update transaction status
   */
  static async updateTransactionStatus(
    transactionId: string,
    status: string,
    failureReason?: string
  ): Promise<PaymentTransaction | null> {
    const updatedTransaction = await prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        status,
        failureReason,
        completedAt: status === "completed" ? new Date() : null,
      },
    });

    return updatedTransaction;
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
    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        userId,
        status: "completed"
      },
    });

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