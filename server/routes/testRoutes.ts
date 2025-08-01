import { Router, type Request, type Response } from "express";
import { prisma } from "../db";
import { storage } from "../storage/index"; 
import { generateRandomPlayer } from "../services/leagueService";
import { Race, PlayerRole, InjuryStatus } from "../../generated/prisma";

const router = Router();

// Test endpoint to verify team creation works end-to-end
router.post('/test-team-creation', async (req: Request, res: Response) => {
  try {
    const { testUserId, teamName } = req.body;
    
    // 1. Create test user profile
    const userProfile = await prisma.userProfile.create({
      data: {
        userId: testUserId,
        email: `${testUserId}@test.com`,
        firstName: 'Test',
        lastName: 'User',
        ndaAccepted: true,
        ndaAcceptedAt: new Date()
      }
    });

    // 2. Create team
    const team = await storage.teams.createTeam({
      userId: userProfile.userId,
      name: teamName,
      division: 8,
      subdivision: 'test'
    });

    // 3. Generate players (same logic as teamRoutes.ts)
    const races = ["human", "sylvan", "gryll", "lumina", "umbra"];
    const requiredPositions = [
      "passer", "passer", "passer",
      "blocker", "blocker", "blocker", "blocker", 
      "runner", "runner", "runner", "runner"
    ];
    
    // Add one flexible position
    const additionalPositions = ["passer", "runner", "blocker"];
    const position = additionalPositions[Math.floor(Math.random() * additionalPositions.length)];
    requiredPositions.push(position);

    const playersCreated = [];
    for (let i = 0; i < 12; i++) {
      const race = races[Math.floor(Math.random() * races.length)];
      const position = requiredPositions[i];
      
      const playerData = generateRandomPlayer("", race, team.id.toString(), position);
      
      const cleanPlayerData = {
        teamId: team.id,
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        race: playerData.race as Race,
        age: playerData.age,
        role: playerData.role as PlayerRole,
        speed: playerData.speed,
        power: playerData.power,
        throwing: playerData.throwing,
        catching: playerData.catching,
        kicking: playerData.kicking,
        staminaAttribute: playerData.staminaAttribute,
        leadership: playerData.leadership,
        agility: playerData.agility,
        potentialRating: playerData.potentialRating,
        dailyStaminaLevel: 100,
        injuryStatus: 'HEALTHY' as InjuryStatus,
        camaraderie: playerData.camaraderie || 75.0,
      };
      
      const createdPlayer = await storage.players.createPlayer(cleanPlayerData);
      playersCreated.push(createdPlayer);
    }

    // 4. Generate staff (same logic as teamRoutes.ts)
    const defaultStaff = [
      { type: 'HEAD_COACH', name: 'Coach Johnson', motivation: 18, development: 15, tactics: 14 },
      { type: 'RECOVERY_SPECIALIST', name: 'Alex Recovery', physiology: 16 },
      { type: 'PASSER_TRAINER', name: 'Sarah Passer', teaching: 15 },
      { type: 'RUNNER_TRAINER', name: 'Mike Runner', teaching: 14 },
      { type: 'BLOCKER_TRAINER', name: 'Lisa Blocker', teaching: 15 },
      { type: 'SCOUT', name: 'Emma Talent', talentIdentification: 16, potentialAssessment: 15 },
      { type: 'SCOUT', name: 'Tony Scout', talentIdentification: 14, potentialAssessment: 15 }
    ];

    const staffCreated = [];
    for (const staffData of defaultStaff) {
      const createdStaff = await storage.staff.createStaff({
        teamId: team.id,
        type: staffData.type as any,
        name: staffData.name,
        level: 1,
        motivation: staffData.motivation || 12,
        development: staffData.development || 12,
        teaching: staffData.teaching || 12,
        physiology: staffData.physiology || 12,
        talentIdentification: staffData.talentIdentification || 12,
        potentialAssessment: staffData.potentialAssessment || 12,
        tactics: staffData.tactics || 12,
        age: 35 + Math.floor(Math.random() * 40)
      });
      staffCreated.push(createdStaff);
    }

    // 5. Verify final state
    const finalPlayers = await storage.players.getPlayersByTeamId(team.id);
    const finalStaff = await storage.staff.getStaffByTeamId(team.id);
    const finances = await prisma.teamFinances.findFirst({ where: { teamId: team.id } });
    const stadium = await prisma.stadium.findFirst({ where: { teamId: team.id } });

    res.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        userProfileId: team.userProfileId
      },
      players: {
        created: playersCreated.length,
        verified: finalPlayers.length,
        positions: finalPlayers.map(p => p.role)
      },
      staff: {
        created: staffCreated.length,
        verified: finalStaff.length,
        types: finalStaff.map(s => s.type)
      },
      infrastructure: {
        hasFinances: !!finances,
        hasStadium: !!stadium,
        credits: finances?.credits?.toString() || '0',
        stadiumCapacity: stadium?.capacity || 0
      }
    });

  } catch (error) {
    console.error('Test team creation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;