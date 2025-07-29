import express from 'express';
import { z } from 'zod';
import { isAuthenticated } from '../googleAuth';
import { TeamStorage } from '../storage/teamStorage';
import { PlayerStorage } from '../storage/playerStorage';
import { StaffStorage } from '../storage/staffStorage';

const router = express.Router();
const teamStorage = new TeamStorage();
const playerStorage = new PlayerStorage();
const staffStorage = new StaffStorage();

// API endpoint for critical alerts as specified in redesign guide
router.get('/critical', isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    
    // Get user's team
    const teams = await teamStorage.getTeamsByUser(user.id);
    if (!teams.length) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const team = teams[0];
    
    // Get all active players
    const players = await playerStorage.getPlayersByTeam(team.id);
    const activePlayers = players.filter(p => !p.isOnMarket && !p.isRetired);
    
    // Count critical issues
    const injuries = activePlayers.filter(p => 
      p.injuryStatus && p.injuryStatus !== 'HEALTHY'
    ).length;
    
    const lowStamina = activePlayers.filter(p => 
      (p.dailyStaminaLevel || 0) < 50
    ).length;
    
    // Get staff for contract analysis (simplified for now)
    const staff = await staffStorage.getStaffByTeam(team.id);
    const expiringContracts = 0; // TODO: Implement contract expiration logic
    
    // Get next match information (simplified for now)
    // TODO: Implement getNextLeagueMatch or use existing match API
    const nextMatch = null;
    let timeUntilNextMatch = 0;
    
    res.json({
      injuries,
      lowStamina, 
      expiringContracts,
      totalIssues: injuries + lowStamina + expiringContracts,
      nextMatch: null // TODO: Implement next match logic
    });
    
  } catch (error) {
    console.error('Error fetching critical alerts:', error);
    res.status(500).json({ error: 'Failed to fetch critical alerts' });
  }
});

// Detailed alerts breakdown
router.get('/detailed', isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    
    const teams = await teamStorage.getTeamsByUser(user.id);
    if (!teams.length) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const team = teams[0];
    const players = await playerStorage.getPlayersByTeam(team.id);
    const activePlayers = players.filter(p => !p.isOnMarket && !p.isRetired);
    
    // Detailed breakdowns
    const injuredPlayers = activePlayers
      .filter(p => p.injuryStatus && p.injuryStatus !== 'HEALTHY')
      .map(p => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        injury: p.injuryStatus,
        recoveryPoints: p.injuryRecoveryPointsCurrent || 0,
        recoveryNeeded: p.injuryRecoveryPointsNeeded || 0
      }));
      
    const lowStaminaPlayers = activePlayers
      .filter(p => (p.dailyStaminaLevel || 0) < 50)
      .map(p => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        stamina: p.dailyStaminaLevel || 0,
        role: p.role
      }));
    
    res.json({
      injuries: {
        count: injuredPlayers.length,
        players: injuredPlayers
      },
      lowStamina: {
        count: lowStaminaPlayers.length,
        players: lowStaminaPlayers
      },
      contracts: {
        count: 0,
        expiring: [] // TODO: Implement
      }
    });
    
  } catch (error) {
    console.error('Error fetching detailed alerts:', error);
    res.status(500).json({ error: 'Failed to fetch detailed alerts' });
  }
});

export default router;