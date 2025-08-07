import express from 'express';
import { simulateEnhancedMatch } from '../services/matchSimulation';
import { Player } from '../../shared/types/api';

const router = express.Router();

// Demo endpoint using the real match simulation system
router.post('/match-simulation', async (req, res) => {
  try {
    // Create realistic demo players with proper Realm Rivalry attributes
    const homeTeamPlayers: Partial<Player>[] = [
      {
        id: 1,
        firstName: 'Alex',
        lastName: 'Thunder',
        race: 'HUMAN',
        role: 'PASSER',
        speed: 28,
        power: 26,
        throwing: 32,
        catching: 24,
        kicking: 20,
        stamina: 30,
        leadership: 29,
        agility: 25,
        age: 24,
        dailyStaminaLevel: 100,
        injuryStatus: 'HEALTHY',
        injuryRecoveryPointsNeeded: 0,
        injuryRecoveryPointsCurrent: 0,
        dailyItemsUsed: [],
        careerInjuries: 0,
        gamesPlayedLastSeason: 12,
        seasonMinutesLeague: 840,
        seasonMinutesTotal: 840,
        isOnMarket: false,
        isRetired: false,
        camaraderieScore: 75,
      },
      {
        id: 2,
        firstName: 'Mike',
        lastName: 'Blitz',
        race: 'SYLVAN',
        role: 'RUNNER',
        speed: 35,
        power: 23,
        throwing: 18,
        catching: 28,
        kicking: 15,
        stamina: 28,
        leadership: 22,
        agility: 36,
        age: 22,
        dailyStaminaLevel: 100,
        injuryStatus: 'HEALTHY',
        injuryRecoveryPointsNeeded: 0,
        injuryRecoveryPointsCurrent: 0,
        dailyItemsUsed: [],
        careerInjuries: 0,
        gamesPlayedLastSeason: 12,
        seasonMinutesLeague: 840,
        seasonMinutesTotal: 840,
        isOnMarket: false,
        isRetired: false,
        camaraderieScore: 75,
      },
      {
        id: 3,
        firstName: 'Sarah',
        lastName: 'Strike',
        race: 'GRYLL',
        role: 'BLOCKER',
        speed: 22,
        power: 38,
        throwing: 16,
        catching: 25,
        kicking: 18,
        stamina: 35,
        leadership: 28,
        agility: 24,
        age: 26,
        dailyStaminaLevel: 100,
        injuryStatus: 'HEALTHY',
        injuryRecoveryPointsNeeded: 0,
        injuryRecoveryPointsCurrent: 0,
        dailyItemsUsed: [],
        careerInjuries: 0,
        gamesPlayedLastSeason: 12,
        seasonMinutesLeague: 840,
        seasonMinutesTotal: 840,
        isOnMarket: false,
        isRetired: false,
        camaraderieScore: 75,
      }
    ];

    const awayTeamPlayers: Partial<Player>[] = [
      {
        id: 4,
        firstName: 'Jake',
        lastName: 'Storm',
        race: 'LUMINA',
        role: 'PASSER',
        speed: 26,
        power: 24,
        throwing: 34,
        catching: 22,
        kicking: 25,
        stamina: 27,
        leadership: 32,
        agility: 23,
        age: 25,
        dailyStaminaLevel: 100,
        injuryStatus: 'HEALTHY',
        injuryRecoveryPointsNeeded: 0,
        injuryRecoveryPointsCurrent: 0,
        dailyItemsUsed: [],
        careerInjuries: 0,
        gamesPlayedLastSeason: 12,
        seasonMinutesLeague: 840,
        seasonMinutesTotal: 840,
        isOnMarket: false,
        isRetired: false,
        camaraderieScore: 75,
      },
      {
        id: 5,
        firstName: 'Lisa',
        lastName: 'Bolt',
        race: 'UMBRA',
        role: 'RUNNER',
        speed: 31,
        power: 25,
        throwing: 19,
        catching: 30,
        kicking: 16,
        stamina: 26,
        leadership: 20,
        agility: 33,
        age: 23,
        dailyStaminaLevel: 100,
        injuryStatus: 'HEALTHY',
        injuryRecoveryPointsNeeded: 0,
        injuryRecoveryPointsCurrent: 0,
        dailyItemsUsed: [],
        careerInjuries: 0,
        gamesPlayedLastSeason: 12,
        seasonMinutesLeague: 840,
        seasonMinutesTotal: 840,
        isOnMarket: false,
        isRetired: false,
        camaraderieScore: 75,
      },
      {
        id: 6,
        firstName: 'Tom',
        lastName: 'Wing',
        race: 'HUMAN',
        role: 'BLOCKER',
        speed: 25,
        power: 35,
        throwing: 17,
        catching: 26,
        kicking: 19,
        stamina: 33,
        leadership: 30,
        agility: 26,
        age: 27,
        dailyStaminaLevel: 100,
        injuryStatus: 'HEALTHY',
        injuryRecoveryPointsNeeded: 0,
        injuryRecoveryPointsCurrent: 0,
        dailyItemsUsed: [],
        careerInjuries: 0,
        gamesPlayedLastSeason: 12,
        seasonMinutesLeague: 840,
        seasonMinutesTotal: 840,
        isOnMarket: false,
        isRetired: false,
        camaraderieScore: 75,
      }
    ];

    // Use the real match simulation system
    const result = await simulateEnhancedMatch(
      homeTeamPlayers as any,
      awayTeamPlayers as any,
      '101',
      '102',
      undefined, // No stadium for demo
      'exhibition'
    );

    res.json({
      success: true,
      result: {
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        events: result.gameData.events,
        playerStats: result.gameData.playerStats,
        finalStats: result.gameData.finalStats,
        matchSummary: result.matchSummary
      }
    });
  } catch (error) {
    console.error('Demo match simulation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to simulate demo match' 
    });
  }
});

export default router;