import { prisma } from "../db";
import type { PaymentTransaction, Prisma } from "../../generated/prisma";

export class PaymentHistoryService {
  /**
   * Record a new payment transaction
   */
  static async recordTransaction(transaction: Prisma.PaymentTransactionCreateInput): Promise<PaymentTransaction> {
    const newTransaction = await prisma.paymentTransaction.create({
      data: transaction
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

    console.log('PaymentHistoryService: Looking for transactions for userId:', userId);
    
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

    console.log('PaymentHistoryService: Found', transactions.length, 'transactions for user', userId);
    console.log('PaymentHistoryService: Total count:', totalCount);
    
    // Convert BigInt fields to strings for JSON serialization
    const serializedTransactions = transactions.map(transaction => ({
      ...transaction,
      creditsAmount: transaction.creditsAmount ? transaction.creditsAmount.toString() : '0',
      teamId: transaction.teamId ? transaction.teamId : null,
      createdAt: transaction.createdAt.toISOString(),
      completedAt: transaction.completedAt ? transaction.completedAt.toISOString() : null,
    }));
    
    return {
      transactions: serializedTransactions,
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
      where: { teamId: parseInt(teamId) },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Update transaction status
   */
  static async updateTransactionStatus(
    transactionId: number,
    status: string
  ): Promise<PaymentTransaction | null> {
    const updatedTransaction = await prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        status,
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
    console.log('PaymentHistoryService: Getting transaction summary for userId:', userId);
    
    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        userId,
        status: "completed"
      },
    });

    console.log('PaymentHistoryService: Found', transactions.length, 'completed transactions for summary');

    const summary = transactions.reduce(
      (acc, transaction) => {
        // Credits
        const creditsAmount = Number(transaction.creditsAmount);
        if (creditsAmount > 0) {
          acc.totalCreditsEarned += creditsAmount;
        } else if (creditsAmount < 0) {
          acc.totalCreditsSpent += Math.abs(creditsAmount);
        }

        // Gems
        if (transaction.gemsAmount && transaction.gemsAmount > 0) {
          acc.totalGemsEarned += transaction.gemsAmount;
        } else if (transaction.gemsAmount && transaction.gemsAmount < 0) {
          acc.totalGemsSpent += Math.abs(transaction.gemsAmount);
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
      teamId: typeof teamId === 'string' ? parseInt(teamId) : teamId,
      transactionType: "purchase",
      itemType,
      itemName,
      creditsAmount: BigInt(creditsSpent > 0 ? -creditsSpent : 0), // Negative for purchases
      gemsAmount: gemsSpent > 0 ? -gemsSpent : 0, // Negative for purchases
      status: "completed",
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
      teamId: typeof teamId === 'string' ? parseInt(teamId) : teamId,
      transactionType: "admin_grant",
      itemType: creditsGranted > 0 ? "credits" : "gems",
      itemName: reason,
      creditsAmount: BigInt(creditsGranted),
      gemsAmount: gemsGranted,
      status: "completed",
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
      teamId: typeof teamId === 'string' ? parseInt(teamId) : teamId,
      transactionType: "reward",
      itemType: creditsEarned > 0 ? "credits" : "gems",
      itemName: `${rewardType} Reward`,
      creditsAmount: BigInt(creditsEarned),
      gemsAmount: gemsEarned,
      status: "completed",
    });
  }
}