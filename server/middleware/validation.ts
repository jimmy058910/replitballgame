import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

// Generic validation middleware factory
export const validateRequest = (schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      // Validate query parameters
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }

      // Validate route parameters
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      return res.status(400).json({
        error: 'Invalid request data'
      });
    }
  };
};

// Common validation schemas
export const commonSchemas = {
  // MongoDB ObjectId validation
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
  
  // UUID validation
  uuid: z.string().uuid(),
  
  // Team ID validation (custom format)
  teamId: z.string().min(1).max(50),
  
  // Match ID validation
  matchId: z.string().min(1).max(50),
  
  // Pagination
  pagination: z.object({
    limit: z.string().transform(val => Math.min(Math.max(1, parseInt(val) || 10), 100)),
    offset: z.string().transform(val => Math.max(0, parseInt(val) || 0))
  }).optional(),
  
  // Money/credits validation
  credits: z.number().min(0).max(10000000),
  
  // Player/consumable names
  name: z.string().min(1).max(100).trim(),
  
  // Consumable effect types
  effectType: z.enum(['MORALE_BOOST', 'STAMINA_BOOST', 'SKILL_BOOST', 'INJURY_PREVENTION']),
  
  // Boolean string conversion
  booleanString: z.string().transform(val => val === 'true')
};

// Specific validation schemas for routes
export const validationSchemas = {
  // Consumable activation
  consumableActivation: {
    body: z.object({
      matchId: commonSchemas.matchId,
      teamId: commonSchemas.teamId,
      consumableId: z.string().min(1),
      consumableName: commonSchemas.name.optional(),
      effectType: commonSchemas.effectType,
      effectData: z.object({
        value: z.number().min(0).max(100),
        duration: z.number().min(1).max(10)
      }).optional()
    })
  },

  // Marketplace listing creation
  marketplaceListing: {
    body: z.object({
      playerId: z.string().min(1),
      price: commonSchemas.credits,
      buyNowPrice: commonSchemas.credits.optional(),
      duration: z.number().min(1).max(168), // Max 1 week
      listingType: z.enum(['AUCTION', 'BUY_NOW', 'BOTH'])
    })
  },

  // Marketplace bid
  marketplaceBid: {
    body: z.object({
      amount: commonSchemas.credits
    }),
    params: z.object({
      listingId: z.string().min(1)
    })
  },

  // Inventory item usage
  inventoryItemUse: {
    body: z.object({
      itemId: z.string().min(1),
      quantity: z.number().min(1).max(99).optional(),
      targetPlayerId: z.string().min(1).optional()
    }),
    params: z.object({
      teamId: commonSchemas.teamId
    })
  },

  // Equipment equip
  equipmentEquip: {
    body: z.object({
      playerId: z.string().min(1),
      equipmentId: z.string().min(1),
      slot: z.enum(['HELMET', 'JERSEY', 'BOOTS', 'GLOVES'])
    })
  },

  // Tournament entry
  tournamentEntry: {
    body: z.object({
      teamId: commonSchemas.teamId,
      entryFee: commonSchemas.credits.optional()
    }),
    params: z.object({
      tournamentId: z.string().min(1)
    })
  },

  // AI team creation
  aiTeamCreation: {
    body: z.object({
      count: z.number().min(1).max(10),
      subdivisionId: z.string().min(1),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional()
    })
  },

  // Generic ID parameter
  idParam: {
    params: z.object({
      id: z.string().min(1)
    })
  }
};