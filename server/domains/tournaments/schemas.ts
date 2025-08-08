import { z } from 'zod';

// Tournament domain schemas
export const tournamentSchemas = {
  // Tournament registration request
  registrationRequest: z.object({
    division: z.number().min(1).max(8),
    paymentType: z.enum(['credits', 'gems', 'both']).optional()
  }),

  // Tournament entry response
  tournamentEntry: z.object({
    id: z.number(),
    tournamentId: z.number(),
    teamId: z.number(),
    registeredAt: z.date(),
    finalRank: z.number().nullable(),
    creditsWon: z.number().default(0),
    gemsWon: z.number().default(0),
    placement: z.number().nullable(),
    tournament: z.object({
      id: z.number(),
      name: z.string(),
      type: z.enum(['DAILY_DIVISIONAL', 'MID_SEASON_CLASSIC']),
      division: z.number(),
      status: z.enum(['REGISTRATION_OPEN', 'IN_PROGRESS', 'COMPLETED']),
      tournamentId: z.number().optional(),
      createdAt: z.date(),
      seasonDay: z.number().optional(),
      gameDay: z.number().optional()
    })
  }),

  // Tournament status response
  tournamentStatus: z.object({
    id: z.string(),
    tournamentId: z.number(),
    name: z.string(),
    type: z.enum(['DAILY_DIVISIONAL', 'MID_SEASON_CLASSIC']),
    division: z.number(),
    status: z.enum(['REGISTRATION_OPEN', 'IN_PROGRESS', 'COMPLETED']),
    participantCount: z.number(),
    maxParticipants: z.number().default(8),
    startTime: z.date().optional(),
    registrationEndTime: z.date().optional(),
    participants: z.array(z.object({
      id: z.number(),
      name: z.string(),
      division: z.number(),
      registeredAt: z.date()
    })),
    prizes: z.object({
      champion: z.object({
        credits: z.number(),
        gems: z.number()
      }),
      runnerUp: z.object({
        credits: z.number(),
        gems: z.number()
      }).optional()
    }).optional()
  }),

  // Force start request
  forceStartRequest: z.object({
    tournamentId: z.number()
  })
};

export type TournamentRegistrationRequest = z.infer<typeof tournamentSchemas.registrationRequest>;
export type TournamentEntry = z.infer<typeof tournamentSchemas.tournamentEntry>;
export type TournamentStatus = z.infer<typeof tournamentSchemas.tournamentStatus>;
export type ForceStartRequest = z.infer<typeof tournamentSchemas.forceStartRequest>;