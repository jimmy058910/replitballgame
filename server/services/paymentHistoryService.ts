import { getPrismaClient } from "../database.js";
import type { PaymentTransaction, Prisma } from "../db";
import type { Team } from '@shared/types/models';


export class PaymentHistoryService {
  /**
   * Record a new payment transaction and update team balance
   */
  static async recordTransaction(transaction: Prisma.PaymentTransactionCreateInput): Promise<any> {
    const prisma = await getPrismaClient();
    
    // Create the transaction
    const newTransaction = await prisma.paymentTransaction.create({
      data: transaction
    });
    
    // Update team balance if teamId is provided
    if (transaction.teamId) {
      await this.updateTeamBalanceFromTransactionHistory(transaction.teamId);
    }
    
    // Serialize BigInt fields for JSON response
    return {
      ...newTransaction,
      creditsAmount: newTransaction.creditsAmount?.toString() || '0',
    };
  }

  /**
   * Manually update team balance based on transaction history (public method)
   */
  static async fixTeamBalanceFromTransactionHistory(teamId: number): Promise<{
    totalCredits: number;
    totalGems: number;
    transactionCount: number;
  }> {
    const result = await this.updateTeamBalanceFromTransactionHistory(teamId);
    return result;
  }

  /**
   * Update team balance based on transaction history
   */
  static async updateTeamBalanceFromTransactionHistory(teamId: number): Promise<{
    totalCredits: number;
    totalGems: number;
    transactionCount: number;
  }> {
    const prisma = await getPrismaClient();
    
    // Get all completed transactions for this team
    const transactions = await prisma.paymentTransaction.findMany({
      where: { 
        teamId: teamId,
        status: 'completed'
      },
    });
    
    // Calculate totals
    let totalCredits = 0;
    let totalGems = 0;
    
    transactions.forEach(transaction => {
      const creditsAmount = Number(transaction.creditsAmount || 0);
      const gemsAmount = transaction.gemsAmount || 0;
      
      totalCredits += creditsAmount;
      totalGems += gemsAmount;
    });
    
    // Update team finances (correct table for financial data)
    await prisma.teamFinances.upsert({
      where: { teamId: teamId },
      update: {
        credits: totalCredits,
        gems: totalGems
      },
      create: {
        teamId: teamId,
        credits: totalCredits,
        gems: totalGems,
        escrowCredits: 0,
        escrowGems: 0,
        projectedIncome: 0,
        projectedExpenses: 0,
        lastSeasonRevenue: 0,
        lastSeasonExpenses: 0,
        facilitiesMaintenanceCost: 5000
      }
    });
    
    console.log(`💰 [BALANCE UPDATE] Team ${teamId}: ${totalCredits}₡, ${totalGems} gems (from ${transactions.length} transactions)`);
    
    return {
      totalCredits,
      totalGems,
      transactionCount: transactions.length
    };
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
    const prisma = await getPrismaClient();
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
    const serializedTransactions = transactions.map((transaction: any) => ({
      ...transaction,
      creditsAmount: transaction.creditsAmount ? transaction.creditsAmount.toString() : '0',
      teamId: transaction.teamId ? transaction.teamId : null,
      createdAt: transaction.createdAt.toISOString(),
      // completedAt property doesn't exist in PaymentTransaction schema
      // completedAt: transaction.completedAt ? transaction.completedAt.toISOString() : null,
    }));
    
    return {
      transactions: serializedTransactions as any,
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
  ): Promise<any[]> {
    const { limit = 50, offset = 0 } = options;

    const prisma = await getPrismaClient();
    const transactions = await prisma.paymentTransaction.findMany({
      where: { teamId: parseInt(teamId, 10) },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Convert BigInt to string for JSON serialization
    return transactions.map(transaction => ({
      ...transaction,
      creditsAmount: transaction.creditsAmount?.toString() || '0'
    }));
  }

  /**
   * Update transaction status
   */
  static async updateTransactionStatus(
    transactionId: number,
    status: string
  ): Promise<PaymentTransaction | null> {
    const prisma = await getPrismaClient();
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
    
    const prisma = await getPrismaClient();
    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        userId,
        status: "completed"
      },
    });

    console.log('PaymentHistoryService: Found', transactions.length, 'completed transactions for summary');

    const summary = transactions.reduce(
      (acc: any, transaction: any) => {
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
      teamId: typeof teamId === 'string' ? parseInt(teamId, 10) : (teamId || 0),
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
      teamId: typeof teamId === 'string' ? parseInt(teamId, 10) : (teamId || 0),
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
      teamId: typeof teamId === 'string' ? parseInt(teamId, 10) : (teamId || 0),
      transactionType: "reward",
      itemType: creditsEarned > 0 ? "credits" : "gems",
      itemName: `${rewardType} Reward`,
      creditsAmount: BigInt(creditsEarned),
      gemsAmount: gemsEarned,
      status: "completed",
    });
  }
}