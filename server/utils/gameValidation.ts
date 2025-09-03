/**
 * Game Validation Utilities
 * Ensures proper scheduling rules and prevents team conflicts
 */

import { getPrismaClient } from '../db';

/**
 * Validate that a team doesn't already have a league game scheduled for the given day
 */
export async function validateTeamAvailability(
  teamId: number, 
  gameDate: Date, 
  excludeGameId?: number
): Promise<{ isAvailable: boolean; conflictingGame?: any }> {
  try {
    // Get the start and end of the game day
    const dayStart = new Date(gameDate);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(gameDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Check for existing league games for this team on this day
    const prisma = await getPrismaClient();
    const existingGame = await prisma.game.findFirst({
      where: {
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ],
        matchType: 'LEAGUE',
        gameDate: {
          gte: dayStart,
          lte: dayEnd
        },
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS']
        },
        ...(excludeGameId ? { id: { not: excludeGameId } } : {})
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      }
    });
    
    return {
      isAvailable: !existingGame,
      conflictingGame: existingGame || undefined
    };
  } catch (error) {
    console.error('Error validating team availability:', error);
    return { isAvailable: false };
  }
}

/**
 * Validate that multiple teams don't have conflicts on the same day
 */
export async function validateMultipleTeamAvailability(
  teamIds: number[], 
  gameDate: Date
): Promise<{ 
  allAvailable: boolean; 
  conflicts: Array<{ teamId: number; conflictingGame: any }> 
}> {
  const conflicts = [];
  
  for (const teamId of teamIds) {
    const validation = await validateTeamAvailability(teamId, gameDate);
    if (!validation.isAvailable && validation.conflictingGame) {
      conflicts.push({
        teamId,
        conflictingGame: validation.conflictingGame
      });
    }
  }
  
  return {
    allAvailable: conflicts.length === 0,
    conflicts
  };
}

/**
 * Get all league games for a specific day
 */
export async function getLeagueGamesForDay(gameDate: Date) {
  const dayStart = new Date(gameDate);
  dayStart.setHours(0, 0, 0, 0);
  
  const dayEnd = new Date(gameDate);
  dayEnd.setHours(23, 59, 59, 999);
  
  const prisma = await getPrismaClient();
  return await prisma.game.findMany({
    where: {
      matchType: 'LEAGUE',
      gameDate: {
        gte: dayStart,
        lte: dayEnd
      },
      status: {
        in: ['SCHEDULED', 'IN_PROGRESS']
      }
    },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } }
    },
    orderBy: {
      gameDate: 'asc'
    }
  });
}

/**
 * Log scheduling violation for debugging
 */
export function logSchedulingViolation(
  action: string,
  details: any
) {
  console.error(`🚨 SCHEDULING VIOLATION - ${action}:`, {
    timestamp: new Date().toISOString(),
    ...details
  });
}