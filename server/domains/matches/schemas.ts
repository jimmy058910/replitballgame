import { z } from 'zod';

// Match domain schemas
export const matchSchemas: Record<string, any> = {
  // Match creation request
  createMatchRequest: z.object({
    homeTeamId: z.number(),
    awayTeamId: z.number(),
    matchType: z.enum(['LEAGUE', 'EXHIBITION', 'TOURNAMENT_DAILY', 'TOURNAMENT_MID_SEASON']),
    scheduledTime: z.date().optional(),
    tournamentId: z.number().optional()
  }),

  // Match state response
  matchState: z.object({
    id: z.number(),
    homeTeamId: z.number(),
    awayTeamId: z.number(),
    homeScore: z.number(),
    awayScore: z.number(),
    gameTime: z.number(),
    status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    matchType: z.enum(['LEAGUE', 'EXHIBITION', 'TOURNAMENT_DAILY', 'TOURNAMENT_MID_SEASON']),
    gameDate: z.date(),
    homeTeam: z.object({
      id: z.number(),
      name: z.string(),
      division: z.number()
    }),
    awayTeam: z.object({
      id: z.number(),
      name: z.string(),
      division: z.number()
    }),
    tournamentId: z.number().optional(),
    simulationLog: z.string().optional(),
    attendance: z.number().optional(),
    mvpPlayerId: z.number().optional()
  }),

  // Match simulation event
  simulationEvent: z.object({
    type: z.enum(['SCORE', 'TURNOVER', 'INJURY', 'SUBSTITUTION', 'TIMEOUT', 'COMMENTARY']),
    gameTime: z.number(),
    message: z.string(),
    playerId: z.number().optional(),
    teamId: z.number().optional(),
    data: z.record(z.any()).optional()
  }),

  // Live match update
  liveMatchUpdate: z.object({
    matchId: z.number(),
    gameTime: z.number(),
    homeScore: z.number(),
    awayScore: z.number(),
    status: z.enum(['IN_PROGRESS', 'COMPLETED']),
    events: z.array(z.lazy(() => matchSchemas.simulationEvent)),
    stats: z.object({
      homeTeam: z.record(z.number()),
      awayTeam: z.record(z.number())
    }).optional()
  })
};

export type CreateMatchRequest = z.infer<typeof matchSchemas.createMatchRequest>;
export type MatchState = z.infer<typeof matchSchemas.matchState>;
export type SimulationEvent = z.infer<typeof matchSchemas.simulationEvent>;
export type LiveMatchUpdate = z.infer<typeof matchSchemas.liveMatchUpdate>;