import { Router } from 'express';
import { prisma } from '../db';
import { calculateGameRevenue, calculateAttendance } from '../../shared/stadiumSystem.js';
// LiveMatchState type import removed - not needed for this endpoint

const router = Router();

// Get enhanced stadium data for a match
router.get('/matches/:matchId/stadium-data', async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const match = await prisma.game.findUnique({
      where: { id: parseInt(matchId) },
      include: {
        homeTeam: {
          include: {
            stadium: true,
            finances: true,
          },
        },
      },
    });

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const stadium = match.homeTeam.stadium;
    if (!stadium) {
      return res.status(404).json({ message: 'Stadium not found' });
    }

    // Calculate attendance and revenue
    const attendanceData = calculateAttendance(
      stadium,
      match.homeTeam.fanLoyalty || 50,
      match.homeTeam.division || 8,
      0, // winStreak - defaulting to 0
      50, // opponentQuality - defaulting to average
      false, // isImportantGame
      'good' // weather
    );

    // Calculate stadium revenue for league matches only
    const revenue =
      match.matchType === 'LEAGUE'
        ? calculateGameRevenue(stadium, attendanceData.attendance, match.homeTeam.fanLoyalty || 50)
        : {
            tickets: 0,
            concessions: 0,
            parking: 0,
            merchandise: 0,
            vip: 0,
            total: 0,
          };

    const stadiumData = {
      capacity: stadium.capacity,
      attendance: attendanceData.attendance,
      fanLoyalty: match.homeTeam.fanLoyalty || 50,
      atmosphere: Math.min(100, (match.homeTeam.fanLoyalty || 50) + (stadium.lightingScreensLevel * 5)),
      revenue,
      facilities: {
        concessions: stadium.concessionsLevel,
        parking: stadium.parkingLevel,
        vip: stadium.vipSuitesLevel,
        merchandising: stadium.merchandisingLevel,
        lighting: stadium.lightingScreensLevel
      }
    };

    res.json(stadiumData);
  } catch (error) {
    console.error('Error getting stadium data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get enhanced match statistics and data
router.get('/matches/:matchId/enhanced-data', async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const match = await prisma.game.findUnique({
      where: { id: parseInt(matchId) },
      include: {
        homeTeam: {
          include: {
            players: {
              where: { isOnMarket: false },
              orderBy: { speed: 'desc' }
            },
            staff: true
          }
        },
        awayTeam: {
          include: {
            players: {
              where: { isOnMarket: false },
              orderBy: { speed: 'desc' }
            },
            staff: true
          }
        }
      }
    });

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Calculate team averages for enhanced stats
    const homePlayerAvg = match.homeTeam.players.reduce((acc: any, p: any) => {
      return {
        speed: acc.speed + p.speed,
        power: acc.power + p.power,
        throwing: acc.throwing + p.throwing,
        catching: acc.catching + p.catching,
        stamina: acc.stamina + p.staminaAttribute,
        count: acc.count + 1
      };
    }, { speed: 0, power: 0, throwing: 0, catching: 0, stamina: 0, count: 0 });

    const awayPlayerAvg = match.awayTeam.players.reduce((acc: any, p: any) => {
      return {
        speed: acc.speed + p.speed,
        power: acc.power + p.power,
        throwing: acc.throwing + p.throwing,
        catching: acc.catching + p.catching,
        stamina: acc.stamina + p.staminaAttribute,
        count: acc.count + 1
      };
    }, { speed: 0, power: 0, throwing: 0, catching: 0, stamina: 0, count: 0 });

    // Calculate possession percentages based on team strength
    const homeStrength = homePlayerAvg.count > 0 ? (
      (homePlayerAvg.speed + homePlayerAvg.power + homePlayerAvg.throwing + homePlayerAvg.catching) / (homePlayerAvg.count * 4)
    ) : 20;
    
    const awayStrength = awayPlayerAvg.count > 0 ? (
      (awayPlayerAvg.speed + awayPlayerAvg.power + awayPlayerAvg.throwing + awayPlayerAvg.catching) / (awayPlayerAvg.count * 4)
    ) : 20;

    const totalStrength = homeStrength + awayStrength;
    const homePossession = totalStrength > 0 ? Math.round((homeStrength / totalStrength) * 100) : 50;
    const awayPossession = 100 - homePossession;

    // Enhanced match statistics
    const enhancedStats = {
      homePossession,
      awayPossession,
      homeYards: Math.floor(homePossession * 3.2), // Rough yards based on possession
      awayYards: Math.floor(awayPossession * 3.2),
      homeFirstDowns: Math.floor(homePossession / 15),
      awayFirstDowns: Math.floor(awayPossession / 15),
      homeTurnovers: Math.floor(Math.random() * 3),
      awayTurnovers: Math.floor(Math.random() * 3),
      homeTeamStrength: Math.round(homeStrength),
      awayTeamStrength: Math.round(awayStrength),
      mvpPlayers: {
        home: match.homeTeam.players
          .slice(0, 3)
          .map((p: any) => ({
            id: p.id,
            name: `${p.firstName} ${p.lastName}`,
            role: p.role,
            power: Math.round((p.speed + p.power + p.throwing + p.catching) / 4),
            stamina: p.dailyStaminaLevel
          })),
        away: match.awayTeam.players
          .slice(0, 3)
          .map((p: any) => ({
            id: p.id,
            name: `${p.firstName} ${p.lastName}`,
            role: p.role,
            power: Math.round((p.speed + p.power + p.throwing + p.catching) / 4),
            stamina: p.dailyStaminaLevel
          }))
      }
    };

    res.json(enhancedStats);
  } catch (error) {
    console.error('Error getting enhanced match data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Match control endpoints
router.post('/matches/:matchId/control', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { action } = req.body;

    // Import matchStateManager dynamically to avoid circular imports
    const { matchStateManager } = await import('../services/matchStateManager');
    
    switch (action) {
      case 'pause':
        await matchStateManager.pauseMatchAsync(matchId);
        break;
      case 'resume':
        await matchStateManager.resumeMatchAsync(matchId);
        break;
      case 'restart':
        await matchStateManager.restartMatch(matchId);
        break;
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    res.json({ success: true, action });
  } catch (error) {
    console.error('Error controlling match:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/matches/:matchId/speed', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { speed } = req.body;

    if (speed < 0.1 || speed > 5.0) {
      return res.status(400).json({ message: 'Invalid speed range' });
    }

    // Import matchStateManager dynamically
    const { matchStateManager } = await import('../services/matchStateManager');
    await matchStateManager.setMatchSpeed(matchId, speed);

    res.json({ success: true, speed });
  } catch (error) {
    console.error('Error setting match speed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;