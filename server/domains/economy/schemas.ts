import { z } from 'zod.js';

// Economy domain schemas
export const economySchemas = {
  // Store item schema
  storeItem: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']),
    priceCredits: z.number().min(0),
    priceGems: z.number().min(0),
    effects: z.record(z.number()).optional(),
    restrictions: z.object({
      race: z.string().optional(),
      position: z.string().optional(),
      level: z.number().optional()
    }).optional(),
    consumable: z.boolean().default(false),
    imageUrl: z.string().optional()
  }),

  // Purchase request
  purchaseRequest: z.object({
    itemId: z.string(),
    quantity: z.number().min(1).max(10).default(1),
    paymentMethod: z.enum(['credits', 'gems'])
  }),

  // Marketplace listing
  marketplaceListing: z.object({
    id: z.number(),
    playerId: z.number(),
    teamId: z.number(),
    startingBid: z.number().min(1000),
    buyNowPrice: z.number().optional(),
    currentBid: z.number(),
    highestBidderId: z.number().optional(),
    endsAt: z.date(),
    status: z.enum(['active', 'sold', 'expired', 'cancelled']),
    player: z.object({
      id: z.number(),
      firstName: z.string(),
      lastName: z.string(),
      position: z.string(),
      race: z.string(),
      overall: z.number(),
      age: z.number(),
      potential: z.number()
    })
  }),

  // Bid request
  bidRequest: z.object({
    amount: z.number().min(1000),
    listingId: z.number()
  }),

  // Financial summary
  financialSummary: z.object({
    teamId: z.number(),
    credits: z.number(),
    gems: z.number(),
    totalValue: z.number(),
    weeklyIncome: z.number(),
    weeklyExpenses: z.number(),
    stadiumRevenue: z.number(),
    sponsorshipDeals: z.number(),
    playerSalaries: z.number(),
    staffSalaries: z.number(),
    maintenanceCosts: z.number()
  }),

  // Ad reward
  adReward: z.object({
    credits: z.number(),
    gems: z.number().default(0),
    multiplier: z.number().default(1),
    type: z.enum(['basic', 'premium', 'milestone'])
  })
};

export type StoreItem = z.infer<typeof economySchemas.storeItem>;
export type PurchaseRequest = z.infer<typeof economySchemas.purchaseRequest>;
export type MarketplaceListing = z.infer<typeof economySchemas.marketplaceListing>;
export type BidRequest = z.infer<typeof economySchemas.bidRequest>;
export type FinancialSummary = z.infer<typeof economySchemas.financialSummary>;
export type AdReward = z.infer<typeof economySchemas.adReward>;