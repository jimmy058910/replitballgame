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
    const newTransaction = await prisma.paymentTransaction.create({
      data: {
        teamId: txData.teamId,
        // @ts-expect-error TS2353
        amount: txData.amount,
        currency: txData.currency || 'usd',
        description: txData.description,
        status: txData.status || 'pending',
        stripePaymentIntentId: txData.stripePaymentIntentId,
        completedAt: txData.completedAt,
      },
      include: {
        team: { select: { name: true } }
      }
    });
    return newTransaction;
  }

  async getPaymentTransactionById(id: number): Promise<PaymentTransaction | null> {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id },
      // @ts-expect-error TS2322
      include: {
        team: { select: { name: true } }
      }
    });
    return transaction;
  }

  async getPaymentTransactionByStripeIntentId(stripePaymentIntentId: string): Promise<PaymentTransaction | null> {
    const transaction = await prisma.paymentTransaction.findFirst({
      // @ts-expect-error TS2353
      where: { stripePaymentIntentId },
      include: {
        team: { select: { name: true } }
      }
    });
    return transaction;
  }

  async updatePaymentTransaction(id: number, updates: Partial<PaymentTransaction>): Promise<PaymentTransaction | null> {
    try {
      // Ensure completedAt is set if status is completed
      // @ts-expect-error TS2339
      if (updates.status === 'completed' && !updates.completedAt) {
        // @ts-expect-error TS2339
        updates.completedAt = new Date();
      }

      const updatedTransaction = await prisma.paymentTransaction.update({
        where: { id },
        data: updates
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
      include: {
        team: { select: { name: true } }
      },
      // @ts-expect-error TS2353
      orderBy: { completedAt: 'desc' }
    });
  }
}

export const paymentStorage = new PaymentStorage();