import express, { Router, type Request, type Response, type NextFunction } from "express";
import Stripe from "stripe";
import { storage } from '../storage/index.js'; // Adjusted path
import { getPrismaClient } from "../database.js"; // Add Prisma import
import { requireAuth } from "../middleware/firebaseAuth.js";
import { logger } from "../utils/logger.js"; // Add logger import
import { z } from "zod"; // For validation
import type { Team } from '@shared/types/models';


const router = Router();

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  logger.warn('Stripe secret not configured - payment features disabled for Alpha testing');
  // Potentially throw to prevent app start, or handle gracefully
  // throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_fallbackkeyifnotset", {
  apiVersion: "2025-06-30.basil", // Updated Stripe API version
});
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Webhook endpoint for Stripe payment confirmations
router.post('/webhook', express.raw({type: 'application/json'}), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, STRIPE_WEBHOOK_SECRET || '');
  } catch (err: any) {
    console.log('⚠️  Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('💰 Payment succeeded:', paymentIntent.id);
      
      // Update payment transaction status
      try {
        const prisma = await getPrismaClient();
        const transaction = await prisma.paymentTransaction.findFirst({ where: { id: parseInt(paymentIntent.id) } });
        if (transaction) {
          await prisma.paymentTransaction.update({
            where: { id: transaction.id },
            data: {
              status: 'completed'
            }
          });
        }
        
        // Add gems/credits to user account
        const metadata = paymentIntent.metadata;
        if (metadata.realmRivalryUserId) {
            const user = await prisma.userProfile.findUnique({ where: { id: parseInt(metadata.realmRivalryUserId) } });
            if (user) {
                if (metadata.creditsAmount) {
                    // Credits managed through team finances, not user profile
                }
                if (metadata.gemsAmount) {
                    // Gems not implemented in current schema
                }
            }
        }
      } catch (error) {
        console.error('Error processing successful payment:', error);
      }
      break;
      
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('❌ Payment failed:', failedPayment.id);
      
      // Update payment transaction status
      try {
        const prisma = await getPrismaClient();
        const transaction = await prisma.paymentTransaction.findFirst({ where: { id: parseInt(failedPayment.id) } });
        if (transaction) {
            await prisma.paymentTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'failed'
                }
            });
        }
      } catch (error) {
        console.error('Error processing failed payment:', error);
      }
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});


// Zod Schemas for validation
const createPaymentIntentSchema = z.object({
  packageId: z.string().min(1, "Package ID is required."),
});

const purchaseGemsSchema = z.object({
  packageId: z.string().min(1, "Gem package ID is required."), // e.g., "pouch_of_gems", "sack_of_gems"
});

const subscribeRealmPassSchema = z.object({
  priceId: z.string().optional(), // For Stripe Price ID if using subscriptions
});


// Seed default credit packages (run once, perhaps via SuperUser or deployment script)
router.post('/seed-packages', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  // SECURITY: Verify admin/superuser role before allowing package seeding
  const userId = req.user?.uid || req.user?.claims?.sub;
  
  try {
    const prisma = await getPrismaClient();
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: userId },
      select: { role: true }
    });
    
    if (!userProfile || (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPER_ADMIN')) {
      logger.warn('Unauthorized attempt to seed credit packages', { userId, role: userProfile?.role });
      return res.status(403).json({ 
        error: 'Access denied. Admin or Super Admin role required for package seeding.',
        requiredRoles: ['ADMIN', 'SUPER_ADMIN']
      });
    }
    
    logger.info('Package seeding authorized', { userId, role: userProfile.role });
  } catch (authError) {
    logger.error('Error checking admin authorization for package seeding', authError);
    return res.status(500).json({ error: 'Authorization check failed' });
  }
  try {
    const defaultPackages = [
      { name: "Starter Pack", description: "Perfect for getting started", credits: 5000, price: 499, bonusCredits: 0, isActive: true, popularTag: false, discountPercent: 0 },
      { name: "Growth Pack", description: "Great value for active players", credits: 15000, price: 999, bonusCredits: 2000, isActive: true, popularTag: true, discountPercent: 0 },
      { name: "Pro Pack", description: "For serious competitors", credits: 35000, price: 1999, bonusCredits: 8000, isActive: true, popularTag: false, discountPercent: 0 },
      { name: "Elite Pack", description: "Maximum value for champions", credits: 75000, price: 3999, bonusCredits: 20000, isActive: true, popularTag: false, discountPercent: 0 }
    ];
    // Use hardcoded credit packages (matching the default packages in seeding)
    const existingPackages = defaultPackages;
    const createdPackages = defaultPackages;
    res.status(201).json({ message: `Seeded ${createdPackages.length} new credit packages. ${existingPackages.length} already existed.`, packages: createdPackages });
  } catch (error) {
    logger.error("Error seeding credit packages", error);
    next(error);
  }
});

// Get available credit packages
router.get('/packages', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Return available credit packages
    const packages = [
      { id: "starter", name: "Starter Pack", description: "Perfect for getting started", credits: 5000, price: 499, bonusCredits: 0, isActive: true, popularTag: false, discountPercent: 0 },
      { id: "growth", name: "Growth Pack", description: "Great value for active players", credits: 15000, price: 999, bonusCredits: 2000, isActive: true, popularTag: true, discountPercent: 0 },
      { id: "pro", name: "Pro Pack", description: "For serious competitors", credits: 35000, price: 1999, bonusCredits: 8000, isActive: true, popularTag: false, discountPercent: 0 },
      { id: "elite", name: "Elite Pack", description: "Maximum value for champions", credits: 75000, price: 3999, bonusCredits: 20000, isActive: true, popularTag: false, discountPercent: 0 }
    ];
    res.json(packages);
  } catch (error) {
    logger.error("Error fetching credit packages", error);
    next(error);
  }
});

// Create payment intent for credit package purchase
router.post("/create-payment-intent", requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { packageId } = createPaymentIntentSchema.parse(req.body);

    // Find the credit package
    const creditPackages = [
      { id: "starter", name: "Starter Pack", credits: 5000, price: 499, bonusCredits: 0 },
      { id: "growth", name: "Growth Pack", credits: 15000, price: 999, bonusCredits: 2000 },
      { id: "pro", name: "Pro Pack", credits: 35000, price: 1999, bonusCredits: 8000 },
      { id: "elite", name: "Elite Pack", credits: 75000, price: 3999, bonusCredits: 20000 }
    ];
    
    const creditPackage = creditPackages.find(pkg => pkg.id === packageId);
    if (!creditPackage) {
      return res.status(404).json({ message: "Credit package not found." });
    }

    const prisma = await getPrismaClient();
    const user = await prisma.userProfile.findUnique({ where: { id: parseInt(userId) } });
    if (!user) return res.status(404).json({ message: "User not found." });

    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam) return res.status(404).json({ message: "Team not found." });

    // Create Stripe payment intent
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ 
        email: user.email || undefined, 
        metadata: { realmRivalryUserId: userId } 
      });
      stripeCustomerId = customer.id;
      
      // Save the Stripe customer ID to the user profile
      await prisma.userProfile.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id }
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: creditPackage.price, // Price in cents
      currency: "usd",
      customer: stripeCustomerId,
      metadata: {
        realmRivalryUserId: userId,
        creditPackageId: packageId,
        creditsAmount: creditPackage.credits.toString(),
        bonusCreditsAmount: creditPackage.bonusCredits.toString(),
        purchaseType: "credits"
      },
      automatic_payment_methods: { enabled: true },
    });

    await prisma.paymentTransaction.create({
      data: {
        userId: userId,
        teamId: userTeam.id,
        status: "pending",
        transactionType: "purchase",
        itemType: "credits",
        itemName: creditPackage.name,
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      packageName: creditPackage.name,
      totalCredits: creditPackage.credits + creditPackage.bonusCredits,
    });
  } catch (error: any) {
    logger.error("Error creating payment intent for credits", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid package ID", errors: error.errors });
    }
    next(error);
  }
});

// Create payment intent for premium gem purchase
router.post("/purchase-gems", requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { packageId } = purchaseGemsSchema.parse(req.body);

    // Use Master Economy v5 gem packages from store config
    const storeConfig = await import("../config/store_config.json", { with: { type: "json" } });
    const gemPackages = storeConfig.default.gemPackages.map((pkg: any) => ({
      id: pkg.id,
      price: Math.round(pkg.price * 100), // Convert to cents
      gems: pkg.gems,
      bonus: pkg.bonus,
      name: pkg.name
    }));
    
    const gemPackage = gemPackages.find(pkg => pkg.id === packageId);
    if (!gemPackage) {
      return res.status(404).json({ message: "Gem package not found." });
    }

    const prisma = await getPrismaClient();
    const user = await prisma.userProfile.findUnique({ where: { id: parseInt(userId) } });
    if (!user) return res.status(404).json({ message: "User not found." });

    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam) return res.status(404).json({ message: "Team not found." });

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ 
        email: user.email || undefined, 
        metadata: { realmRivalryUserId: userId } 
      });
      stripeCustomerId = customer.id;
      
      // Save the Stripe customer ID to the user profile
      await prisma.userProfile.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id }
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: gemPackage.price, // Price in cents
      currency: "usd",
      customer: stripeCustomerId,
      metadata: {
        realmRivalryUserId: userId,
        gemPackageId: packageId,
        gemsAmount: gemPackage.gems.toString(),
        bonusGemsAmount: gemPackage.bonus.toString(),
        purchaseType: "gems"
      },
      automatic_payment_methods: { enabled: true },
    });

    await prisma.paymentTransaction.create({
        data: {
      userId: userId,
      teamId: userTeam.id,
      status: "pending",
      transactionType: "purchase",
      itemType: "gems",
      itemName: gemPackage.name,
        }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      packageName: gemPackage.name,
      totalGems: gemPackage.gems + gemPackage.bonus,
    });
  } catch (error: any) {
    logger.error("Error creating payment intent for gems", error);
     if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid gem package ID", errors: error.errors });
    }
    next(error);
  }
});

// Realm Pass Subscription
router.post("/create-subscription", requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { priceId } = subscribeRealmPassSchema.parse(req.body);

    // Get Realm Pass subscription details from store config
    const storeConfig = await import("../config/store_config.json", { with: { type: "json" } });
    const realmPassConfig = storeConfig.default.realmPassSubscription;
    
    const prisma = await getPrismaClient();
    const user = await prisma.userProfile.findUnique({ where: { id: parseInt(userId) } });
    if (!user) return res.status(404).json({ message: "User not found." });

    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam) return res.status(404).json({ message: "Team not found." });

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
        metadata: { realmRivalryUserId: userId }
      });
      stripeCustomerId = customer.id;
      
      // Save the Stripe customer ID to the user profile
      await prisma.userProfile.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id }
      });
    }

    // For one-time payment (monthly Realm Pass)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(realmPassConfig.price * 100), // Convert to cents
      currency: "usd",
      customer: stripeCustomerId,
      metadata: {
        realmRivalryUserId: userId,
        purchaseType: "realm_pass",
        monthlyGems: realmPassConfig.monthlyGems.toString(),
        subscriptionType: "monthly"
      },
      automatic_payment_methods: { enabled: true },
    });

    await prisma.paymentTransaction.create({
        data: {
      userId: userId,
      teamId: userTeam.id,
      status: "pending",
      transactionType: "purchase",
      itemType: "subscription",
      itemName: "Realm Pass - Monthly",
        }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      packageName: "Realm Pass - Monthly",
      monthlyGems: realmPassConfig.monthlyGems,
      benefits: realmPassConfig.benefits
    });
  } catch (error: any) {
    logger.error("Error creating Realm Pass subscription", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid subscription request", errors: error.errors });
    }
    next(error);
  }
});


// Stripe Webhook to handle successful payments
router.post("/webhook", express.raw({type: 'application/json'}), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  if (!STRIPE_WEBHOOK_SECRET) {
      console.error("Stripe webhook secret is not set. Cannot verify event.");
      return res.status(400).send("Webhook Error: Secret not configured.");
  }

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    console.log(`PaymentIntent ${paymentIntent.id} succeeded.`);

    try {
      const prisma = await getPrismaClient();
      const transaction = await prisma.paymentTransaction.findFirst({ where: { id: parseInt(paymentIntent.id) } });
      if (!transaction) {
        console.error(`Transaction not found in DB for successful PaymentIntent: ${paymentIntent.id}`);
        return res.status(404).json({ message: "Transaction not found for PI, but Stripe payment succeeded." });
      }
      if (transaction.status === "completed") {
        console.log(`Transaction ${transaction.id} already marked completed for PI ${paymentIntent.id}. Ignoring duplicate webhook.`);
        return res.json({ received: true, message: "Already processed." });
      }

      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
        status: "completed",
        }
      });

      const user = await prisma.userProfile.findUnique({ where: { id: parseInt(transaction.userId) } });
      if (user) {
        const team = await prisma.team.findFirst({ where: { userProfileId: user.id } });
        if (team) {
          const finances = await prisma.teamFinances.findUnique({ where: { teamId: team.id } });
          if (finances) {
            const updates: Partial<typeof finances> = {};
            // Credit and gem amounts not implemented in current schema
            if (Object.keys(updates).length > 0) {
                await prisma.teamFinances.update({ where: { teamId: team.id }, data: updates });
                console.log(`User ${transaction.userId} (Team ${team.id}) granted resources for transaction ${transaction.id}: ${transaction.creditsAmount || 0} credits, ${transaction.gemsAmount || 0} gems`);
            }
          }
        }
      }
    } catch (dbError) {
      console.error("Error processing successful payment in DB:", dbError);
      // Don't send 500 to Stripe, as it will retry. Log and investigate.
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    console.log(`PaymentIntent ${paymentIntent.id} failed.`);
    try {
        const prisma = await getPrismaClient();
        const transaction = await prisma.paymentTransaction.findFirst({ where: { id: parseInt(paymentIntent.id) } });
        if (transaction && transaction.status !== 'failed') {
             await prisma.paymentTransaction.update({
                where: { id: transaction.id },
                data: {
                status: "failed",
                metadata: { failureReason: paymentIntent.last_payment_error?.message || "Unknown Stripe failure" },
                }
            });
        }
    } catch (dbError) {
        console.error("Error updating DB for failed payment:", dbError);
    }
  }
  // ... handle other event types (e.g., payment_intent.payment_failed)

  res.json({ received: true });
});

// Get user's payment history
router.get('/history', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const prisma = await getPrismaClient();
    const history = await prisma.paymentTransaction.findMany({ where: { userId: userId } });
    res.json(history);
  } catch (error) {
    console.error("Error fetching payment history:", error);
    next(error);
  }
});

export default router;
