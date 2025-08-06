import express from 'express';
import { simulateEnhancedMatch } from '../services/matchSimulation';
import { Player } from '../../generated/prisma';

const router = express.Router();

// Demo endpoint using the real match simulation system
router.post('/match-simulation', async (req, res) => {
  try {
    // Create realistic demo players with proper Realm Rivalry attributes
    const homeTeamPlayers: Player[] = [
      {
        id: 1,
        name: 'Alex Thunder',
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
        potential: 3.5,
        age: 24,
        userProfileId: 44010914,
        teamId: 101,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        name: 'Mike Blitz',
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
        potential: 4.0,
        age: 22,
        userProfileId: 44010914,
        teamId: 101,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        name: 'Sarah Strike',
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
        potential: 3.2,
        age: 26,
        userProfileId: 44010914,
        teamId: 101,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const awayTeamPlayers: Player[] = [
      {
        id: 4,
        name: 'Jake Storm',
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
        potential: 4.2,
        age: 25,
        userProfileId: 44010914,
        teamId: 102,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 5,
        name: 'Lisa Bolt',
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
        potential: 3.8,
        age: 23,
        userProfileId: 44010914,
        teamId: 102,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 6,
        name: 'Tom Wing',
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
        potential: 3.6,
        age: 27,
        userProfileId: 44010914,
        teamId: 102,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Use the real match simulation system
    const result = await simulateEnhancedMatch(
      homeTeamPlayers,
      awayTeamPlayers,
      101,
      102,
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