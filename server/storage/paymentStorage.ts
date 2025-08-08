import { prisma } from '../db';
import { PrismaClient, PaymentTransaction } from '../../generated/prisma';



export class PaymentStorage {
  async createPaymentTransaction(txData: {
    teamId: number;
    amount: bigint;
    currency?: string;
    description: string;
    status?: string;
    stripePaymentIntentId?: string;
    completedAt?: Date;
  }): Promise<PaymentTransaction> {
    // PaymentTransaction schema is incomplete - using minimal required fields
    const newTransaction = await prisma.paymentTransaction.create({
      data: {
        teamId: txData.teamId,
        userId: "temp-user", // Required by schema - should be actual user ID
        transactionType: "PURCHASE", // Required by schema
        itemName: txData.description || "Unknown Item", // Required by schema
        itemType: "OTHER", // Required by schema
        status: txData.status || 'pending',
      }
      // include: {
      //   team: { select: { name: true } }
      // } // PaymentTransaction doesn't have team relation yet
    });
    return newTransaction;
  }

  async getPaymentTransactionById(id: number): Promise<PaymentTransaction | null> {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id }
      // include: {
      //   team: { select: { name: true } }
      // } // PaymentTransaction doesn't have team relation yet
    });
    return transaction;
  }

  async getPaymentTransactionByStripeIntentId(stripePaymentIntentId: string): Promise<PaymentTransaction | null> {
    const transaction = await prisma.paymentTransaction.findFirst({
      // where: { stripePaymentIntentId }, // stripePaymentIntentId not in schema yet
      where: { id: 0 } // Placeholder until stripePaymentIntentId added to schema
      // include: {
      //   team: { select: { name: true } }
      // } // PaymentTransaction doesn't have team relation yet
    });
    return transaction;
  }

  async updatePaymentTransaction(id: number, updates: any): Promise<PaymentTransaction | null> {
    try {
      // Ensure completedAt is set if status is completed
      if (updates.status === 'completed' && !updates.completedAt) {
        updates.completedAt = new Date();
      }

      // Remove 'id' from updates to avoid Prisma constraint conflicts
      const { id: _, ...updateData } = updates;
      const updatedTransaction = await prisma.paymentTransaction.update({
        where: { id },
        data: updateData
      });
      return updatedTransaction;
    } catch (error) {
      console.warn(`Payment transaction with ID ${id} not found for update.`);
      return null;
    }
  }

  async getPaymentTransactionsByTeam(teamId: number, limit: number = 50): Promise<PaymentTransaction[]> {
    return await prisma.paymentTransaction.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  async getCompletedTransactions(teamId?: number): Promise<PaymentTransaction[]> {
    return await prisma.paymentTransaction.findMany({
      where: {
        status: 'completed',
        ...(teamId ? { teamId } : {})
      },
      // include: {
      //   team: { select: { name: true } }
      // }, // PaymentTransaction doesn't have team relation yet
      orderBy: { createdAt: 'desc' } // Using createdAt instead of completedAt
    });
  }
}

export const paymentStorage = new PaymentStorage();