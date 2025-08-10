import { Router } from 'express';
import { PlayerSkillsService } from '../services/playerSkillsService.js';
import { isAuthenticated } from '../googleAuth.js';
import { prisma } from '../db.js';

const router = Router();

// Get all skills available in the game
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const skills = await PlayerSkillsService.getAllSkills();
    res.json({ skills });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// Get a specific skill by ID
router.get('/skills/:skillId', isAuthenticated, async (req, res) => {
  try {
    const skillId = parseInt(req.params.skillId);
    const skill = await PlayerSkillsService.getSkillById(skillId);
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    res.json({ skill });
  } catch (error) {
    console.error('Error fetching skill:', error);
    res.status(500).json({ error: 'Failed to fetch skill' });
  }
});

// Get all skills for a specific player
router.get('/player/:playerId/skills', isAuthenticated, async (req, res) => {
  try {
    const { playerId } = req.params;
    const playerSkills = await PlayerSkillsService.getPlayerSkills(playerId);
    const skillCount = await PlayerSkillsService.getPlayerSkillCount(playerId);
    const eligibleSkills = await PlayerSkillsService.getEligibleSkills(playerId);

    res.json({
      playerSkills,
      skillCount,
      maxSkills: 3,
      eligibleSkills: eligibleSkills.length,
    });
  } catch (error) {
    console.error('Error fetching player skills:', error);
    res.status(500).json({ error: 'Failed to fetch player skills' });
  }
});

// Get eligible skills for a player
router.get('/player/:playerId/eligible-skills', isAuthenticated, async (req, res) => {
  try {
    const { playerId } = req.params;
    const eligibleSkills = await PlayerSkillsService.getEligibleSkills(playerId);

    res.json({ eligibleSkills });
  } catch (error) {
    console.error('Error fetching eligible skills:', error);
    res.status(500).json({ error: 'Failed to fetch eligible skills' });
  }
});

// Get skill effects for a player (used in match simulation)
router.get('/player/:playerId/effects', isAuthenticated, async (req, res) => {
  try {
    const { playerId } = req.params;
    const effects = await PlayerSkillsService.getPlayerSkillEffects(playerId);

    res.json(effects);
  } catch (error) {
    console.error('Error fetching skill effects:', error);
    res.status(500).json({ error: 'Failed to fetch skill effects' });
  }
});

// Manually trigger skill acquisition for a player (admin/testing)
router.post('/player/:playerId/acquire/:skillId', isAuthenticated, async (req, res) => {
  try {
    const { playerId, skillId } = req.params;
    const skillIdNum = parseInt(skillId);
    
    const success = await PlayerSkillsService.acquireSkill(playerId, skillIdNum);
    
    if (success) {
      const skill = await PlayerSkillsService.getSkillById(skillIdNum);
      res.json({ 
        success: true, 
        message: `Successfully acquired skill: ${skill?.name}`,
        skill 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Failed to acquire skill (skill limit reached or already owned)' 
      });
    }
  } catch (error) {
    console.error('Error acquiring skill:', error);
    res.status(500).json({ error: 'Failed to acquire skill' });
  }
});

// Manually trigger skill upgrade for a player (admin/testing)
router.post('/player/:playerId/upgrade/:skillId', isAuthenticated, async (req, res) => {
  try {
    const { playerId, skillId } = req.params;
    const skillIdNum = parseInt(skillId);
    
    const success = await PlayerSkillsService.upgradeSkill(playerId, skillIdNum);
    
    if (success) {
      const skill = await PlayerSkillsService.getSkillById(skillIdNum);
      res.json({ 
        success: true, 
        message: `Successfully upgraded skill: ${skill?.name}`,
        skill 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Failed to upgrade skill (not owned or already max tier)' 
      });
    }
  } catch (error) {
    console.error('Error upgrading skill:', error);
    res.status(500).json({ error: 'Failed to upgrade skill' });
  }
});

// Process end-of-season skill progression for user's team
router.post('/team/season-progression', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's team
    const team = await prisma.team.findFirst({
      where: { userProfileId: userId }
    });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const results = await PlayerSkillsService.processSeasonSkillProgression(team.id.toString());
    
    res.json({
      message: 'Season skill progression completed',
      results,
    });
  } catch (error) {
    console.error('Error processing season progression:', error);
    res.status(500).json({ error: 'Failed to process season progression' });
  }
});

// Get skill progression summary for user's team
router.get('/team/progression-summary', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's team
    const team = await prisma.team.findFirst({
      where: { userProfileId: userId }
    });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get all players and their skill counts
    const teamPlayers = await prisma.player.findMany({
      where: { teamId: team.id }
    });
    
    const summary = [];
    for (const player of teamPlayers) {
      const skillCount = await PlayerSkillsService.getPlayerSkillCount(player.id.toString());
      const skillUpChance = PlayerSkillsService.calculateSkillUpChance(player);
      const eligibleSkills = await PlayerSkillsService.getEligibleSkills(player.id.toString());
      
      summary.push({
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        currentSkills: skillCount,
        maxSkills: 3,
        skillUpChance: skillUpChance.toFixed(1),
        eligibleSkillsCount: eligibleSkills.length,
      });
    }

    res.json({ summary });
  } catch (error) {
    console.error('Error fetching progression summary:', error);
    res.status(500).json({ error: 'Failed to fetch progression summary' });
  }
});

// Simulate skill-up event for a specific player (testing)
router.post('/player/:playerId/skill-up-event', isAuthenticated, async (req, res) => {
  try {
    const { playerId } = req.params;
    const result = await PlayerSkillsService.processSkillUpEvent(playerId);
    
    res.json({
      message: 'Skill-up event processed',
      result,
    });
  } catch (error) {
    console.error('Error processing skill-up event:', error);
    res.status(500).json({ error: 'Failed to process skill-up event' });
  }
});

export default router;