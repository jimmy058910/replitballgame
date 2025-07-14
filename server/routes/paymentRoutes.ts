import express, { Router, type Request, type Response, type NextFunction } from "express";
import Stripe from "stripe";
import { storage } from "../storage"; // Adjusted path
import { isAuthenticated } from "../replitAuth"; // Adjusted path
import { z } from "zod"; // For validation

const router = Router();

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('FATAL ERROR: Missing required Stripe secret: STRIPE_SECRET_KEY');
  // Potentially throw to prevent app start, or handle gracefully
  // throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_fallbackkeyifnotset", {
  apiVersion: "2025-05-28.basil", // Ensure this matches your Stripe API version
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
        await storage.payments.updatePaymentTransactionByStripeId(paymentIntent.id, {
          status: 'completed',
          completedAt: new Date().toISOString()
        });
        
        // Add gems/credits to user account
        const metadata = paymentIntent.metadata;
        if (metadata.realmRivalryUserId) {
          if (metadata.creditsAmount) {
            await storage.users.addCredits(metadata.realmRivalryUserId, parseInt(metadata.creditsAmount));
          }
          if (metadata.gemsAmount) {
            await storage.users.addGems(metadata.realmRivalryUserId, parseInt(metadata.gemsAmount));
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
        await storage.payments.updatePaymentTransactionByStripeId(failedPayment.id, {
          status: 'failed',
          failedAt: new Date().toISOString()
        });
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
router.post('/seed-packages', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  // TODO: Add SuperUser/Admin check for this endpoint
  try {
    const defaultPackages = [
      { name: "Starter Pack", description: "Perfect for getting started", credits: 5000, price: 499, bonusCredits: 0, isActive: true, popularTag: false, discountPercent: 0 },
      { name: "Growth Pack", description: "Great value for active players", credits: 15000, price: 999, bonusCredits: 2000, isActive: true, popularTag: true, discountPercent: 0 },
      { name: "Pro Pack", description: "For serious competitors", credits: 35000, price: 1999, bonusCredits: 8000, isActive: true, popularTag: false, discountPercent: 0 },
      { name: "Elite Pack", description: "Maximum value for champions", credits: 75000, price: 3999, bonusCredits: 20000, isActive: true, popularTag: false, discountPercent: 0 }
    ];
    const existingPackages = await storage.payments.getAllCreditPackages();
    const packagesToCreate = defaultPackages.filter(dp => !existingPackages.find((ep: any) => ep.name === dp.name));

    const createdPackages = [];
    for (const packageData of packagesToCreate) {
      const pkg = await storage.payments.createCreditPackage(packageData);
      createdPackages.push(pkg);
    }
    res.status(201).json({ message: `Seeded ${createdPackages.length} new credit packages. ${existingPackages.length} already existed.`, packages: createdPackages });
  } catch (error) {
    console.error("Error seeding credit packages:", error);
    next(error);
  }
});

// Get available credit packages
router.get('/packages', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const packages = await storage.payments.getActiveCreditPackages(); // Assumes this fetches only active ones by default
    res.json(packages);
  } catch (error) {
    console.error("Error fetching credit packages:", error);
    next(error);
  }
});

// Create payment intent for credit package purchase
router.post("/create-payment-intent", isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { packageId } = createPaymentIntentSchema.parse(req.body);

    const creditPackage = await storage.payments.getCreditPackageById(packageId);
    if (!creditPackage || !creditPackage.isActive) {
      return res.status(404).json({ message: "Credit package not found or not active." });
    }

    const user = await storage.users.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined, // Stripe might require email
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
        metadata: { realmRivalryUserId: userId }
      });
      stripeCustomerId = customer.id;
      await storage.users.upsertUser({ id: userId, stripeCustomerId }); // Save customer ID
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: creditPackage.price, // Price in cents
      currency: "usd",
      customer: stripeCustomerId,
      metadata: {
        realmRivalryUserId: userId,
        creditPackageId: packageId,
        creditsAmount: creditPackage.credits,
        bonusCreditsAmount: creditPackage.bonusCredits || 0,
        purchaseType: "credits"
      },
      automatic_payment_methods: { enabled: true },
    });

    await storage.payments.createPaymentTransaction({
      userId: userId,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: stripeCustomerId, // Store for reference
      amount: creditPackage.price,
      creditsChange: creditPackage.credits + (creditPackage.bonusCredits || 0),
      status: "pending", // Initial status
      currency: "usd",
      transactionType: "purchase",
      itemType: "credits",
      itemName: creditPackage.name,
      paymentMethod: "stripe",
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      packageName: creditPackage.name,
      totalCredits: creditPackage.credits + (creditPackage.bonusCredits || 0)
    });
  } catch (error: any) {
    console.error("Error creating payment intent for credits:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid package ID", errors: error.errors });
    }
    next(error);
  }
});

// Create payment intent for premium gem purchase
router.post("/purchase-gems", isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { packageId } = purchaseGemsSchema.parse(req.body);

    // Use Master Economy v5 gem packages from store config
    const storeConfig = await import("../config/store_config.json", { assert: { type: "json" } });
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

    const user = await storage.users.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email || undefined, metadata: { realmRivalryUserId: userId } });
      stripeCustomerId = customer.id;
      await storage.users.upsertUser({ id: userId, stripeCustomerId });
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

    await storage.payments.createPaymentTransaction({
      userId: userId,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: stripeCustomerId,
      amount: gemPackage.price,
      gemsChange: gemPackage.gems + gemPackage.bonus, // Store granted gems
      status: "pending",
      currency: "usd",
      transactionType: "purchase",
      itemType: "gems",
      itemName: gemPackage.name,
      paymentMethod: "stripe",
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      packageName: gemPackage.name,
      totalGems: gemPackage.gems + gemPackage.bonus,
    });
  } catch (error: any) {
    console.error("Error creating payment intent for gems:", error);
     if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid gem package ID", errors: error.errors });
    }
    next(error);
  }
});

// Realm Pass Subscription
router.post("/create-subscription", isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { priceId } = subscribeRealmPassSchema.parse(req.body);

    // Get Realm Pass subscription details from store config
    const storeConfig = await import("../config/store_config.json", { assert: { type: "json" } });
    const realmPassConfig = storeConfig.default.realmPassSubscription;
    
    const user = await storage.users.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
        metadata: { realmRivalryUserId: userId }
      });
      stripeCustomerId = customer.id;
      await storage.users.upsertUser({ id: userId, stripeCustomerId });
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

    await storage.payments.createPaymentTransaction({
      userId: userId,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: stripeCustomerId,
      amount: Math.round(realmPassConfig.price * 100),
      gemsChange: realmPassConfig.monthlyGems,
      status: "pending",
      currency: "usd",
      transactionType: "purchase",
      itemType: "subscription",
      itemName: "Realm Pass - Monthly",
      paymentMethod: "stripe",
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      packageName: "Realm Pass - Monthly",
      monthlyGems: realmPassConfig.monthlyGems,
      benefits: realmPassConfig.benefits
    });
  } catch (error: any) {
    console.error("Error creating Realm Pass subscription:", error);
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
      const transaction = await storage.payments.getPaymentTransactionByStripeIntentId(paymentIntent.id);
      if (!transaction) {
        console.error(`Transaction not found in DB for successful PaymentIntent: ${paymentIntent.id}`);
        return res.status(404).json({ message: "Transaction not found for PI, but Stripe payment succeeded." });
      }
      if (transaction.status === "completed") {
        console.log(`Transaction ${transaction.id} already marked completed for PI ${paymentIntent.id}. Ignoring duplicate webhook.`);
        return res.json({ received: true, message: "Already processed." });
      }

      await storage.payments.updatePaymentTransaction(transaction.id, {
        status: "completed",
        completedAt: new Date(),
        receiptUrl: paymentIntent.latest_charge ? (paymentIntent.latest_charge as any).receipt_url : null,
        paymentMethod: paymentIntent.payment_method_types?.[0] || 'unknown',
      });

      const user = await storage.users.getUser(transaction.userId);
      if (user) {
        const team = await storage.teams.getTeamByUserId(user.id);
        if (team) {
          const finances = await storage.teamFinances.getTeamFinances(team.id);
          if (finances) {
            const updates: Partial<typeof finances> = {};
            if (transaction.creditsChange && transaction.creditsChange > 0) {
                updates.credits = (finances.credits || 0) + transaction.creditsChange;
            }
            if (transaction.gemsChange && transaction.gemsChange > 0) {
                updates.gems = (finances.gems || 0) + transaction.gemsChange;
            }
            if (Object.keys(updates).length > 0) {
                await storage.teamFinances.updateTeamFinances(team.id, updates);
                console.log(`User ${transaction.userId} (Team ${team.id}) granted resources for transaction ${transaction.id}: ${transaction.creditsChange || 0} credits, ${transaction.gemsChange || 0} gems`);
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
        const transaction = await storage.payments.getPaymentTransactionByStripeIntentId(paymentIntent.id);
        if (transaction && transaction.status !== 'failed') {
             await storage.payments.updatePaymentTransaction(transaction.id, {
                status: "failed",
                failureReason: paymentIntent.last_payment_error?.message || "Unknown Stripe failure",
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
router.get('/history', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const history = await storage.payments.getUserPaymentHistory(userId);
    res.json(history);
  } catch (error) {
    console.error("Error fetching payment history:", error);
    next(error);
  }
});

export default router;
