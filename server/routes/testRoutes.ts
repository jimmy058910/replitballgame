import { Router, type Request, type Response } from "express";
import { getPrismaClient } from "../database.js";
import { storage } from '../storage/index.js'; 
import { generateRandomPlayer } from '../services/leagueService.js';
import { Race, PlayerRole, InjuryStatus } from "../db";

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
    const races = ["HUMAN", "SYLVAN", "GRYLL", "LUMINA", "UMBRA"];
    const requiredPositions = [
      "PASSER", "PASSER", "PASSER",
      "BLOCKER", "BLOCKER", "BLOCKER", "BLOCKER", 
      "RUNNER", "RUNNER", "RUNNER", "RUNNER"
    ];
    
    // Add one flexible position
    const additionalPositions = ["PASSER", "RUNNER", "BLOCKER"];
    const position = additionalPositions[Math.floor(Math.random() * additionalPositions.length)];
    requiredPositions.push(position);

    const playersCreated = [];
    for (let i = 0; i < 12; i++) {
      const race = races[Math.floor(Math.random() * races.length)];
      const position = requiredPositions[i];
      
      const playerData = generateRandomPlayer("Player", race, team.id, position);
      
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
        camaraderieScore: playerData.camaraderieScore || 75.0,
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
        positions: finalPlayers.map((p: any) => p.role)
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

// PRODUCTION: Populate existing teams that were created before roster generation
router.post('/populate-existing-team', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.body;
    
    if (!teamId) {
      return res.status(400).json({ error: 'teamId is required' });
    }
    
    // Check if team exists
    const team = await prisma.team.findUnique({ where: { id: parseInt(teamId) } });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check if team already has players
    const existingPlayers = await storage.players.getPlayersByTeamId(team.id);
    const existingStaff = await storage.staff.getStaffByTeamId(team.id);
    
    let playersCreated = 0;
    let staffCreated = 0;
    
    // Generate players if none exist
    if (existingPlayers.length === 0) {
      const races = ["HUMAN", "SYLVAN", "GRYLL", "LUMINA", "UMBRA"];
      const requiredPositions = [
        "PASSER", "PASSER", "PASSER",
        "BLOCKER", "BLOCKER", "BLOCKER", "BLOCKER", 
        "RUNNER", "RUNNER", "RUNNER", "RUNNER"
      ];
      
      const additionalPositions = ["PASSER", "RUNNER", "BLOCKER"];
      const position = additionalPositions[Math.floor(Math.random() * additionalPositions.length)];
      requiredPositions.push(position);

      for (let i = 0; i < 12; i++) {
        const race = races[Math.floor(Math.random() * races.length)];
        const position = requiredPositions[i];
        
        const playerData = generateRandomPlayer("Player", race, team.id, position);
        
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
          camaraderieScore: playerData.camaraderieScore || 75.0,
        };
        
        await storage.players.createPlayer(cleanPlayerData);
        playersCreated++;
      }
    }
    
    // Generate staff if none exist
    if (existingStaff.length === 0) {
      const defaultStaff = [
        { type: 'HEAD_COACH', name: 'Coach Johnson', motivation: 18, development: 15, tactics: 14 },
        { type: 'RECOVERY_SPECIALIST', name: 'Alex Recovery', physiology: 16 },
        { type: 'PASSER_TRAINER', name: 'Sarah Passer', teaching: 15 },
        { type: 'RUNNER_TRAINER', name: 'Mike Runner', teaching: 14 },
        { type: 'BLOCKER_TRAINER', name: 'Lisa Blocker', teaching: 15 },
        { type: 'SCOUT', name: 'Emma Talent', talentIdentification: 16, potentialAssessment: 15 },
        { type: 'SCOUT', name: 'Tony Scout', talentIdentification: 14, potentialAssessment: 15 }
      ];

      for (const staffData of defaultStaff) {
        await storage.staff.createStaff({
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
        staffCreated++;
      }
    }
    
    res.json({
      success: true,
      team: team.name,
      playersCreated,
      staffCreated,
      message: `Team populated: ${playersCreated} players, ${staffCreated} staff members`
    });
    
  } catch (error) {
    console.error('Error populating team:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// PRODUCTION: Find and populate ALL existing teams without rosters
router.post('/populate-all-existing-teams', async (req: Request, res: Response) => {
  try {
    // Find all teams
    const teams = await prisma.team.findMany({
      include: {
        _count: {
          select: {
            players: true,
            staff: true
          }
        }
      }
    });
    
    console.log(`🔍 Found ${teams.length} teams in database`);
    
    const results = [];
    
    for (const team of teams) {
      const hasPlayers = team._count.players > 0;
      const hasStaff = team._count.staff > 0;
      
      console.log(`🔍 Team "${team.name}": ${team._count.players} players, ${team._count.staff} staff`);
      
      let playersCreated = 0;
      let staffCreated = 0;
      
      // Generate players if none exist
      if (!hasPlayers) {
        console.log(`🏃 Generating players for "${team.name}"...`);
        
        const races = ["HUMAN", "SYLVAN", "GRYLL", "LUMINA", "UMBRA"];
        const requiredPositions = [
          "PASSER", "PASSER", "PASSER",
          "BLOCKER", "BLOCKER", "BLOCKER", "BLOCKER", 
          "RUNNER", "RUNNER", "RUNNER", "RUNNER"
        ];
        
        const additionalPositions = ["PASSER", "RUNNER", "BLOCKER"];
        const position = additionalPositions[Math.floor(Math.random() * additionalPositions.length)];
        requiredPositions.push(position);

        for (let i = 0; i < 12; i++) {
          const race = races[Math.floor(Math.random() * races.length)];
          const position = requiredPositions[i];
          
          const playerData = generateRandomPlayer("Player", race, team.id, position);
          
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
            camaraderieScore: playerData.camaraderieScore || 75.0,
          };
          
          await storage.players.createPlayer(cleanPlayerData);
          playersCreated++;
        }
      }
      
      // Generate staff if none exist
      if (!hasStaff) {
        console.log(`👔 Generating staff for "${team.name}"...`);
        
        const defaultStaff = [
          { type: 'HEAD_COACH', name: 'Coach Johnson', motivation: 18, development: 15, tactics: 14 },
          { type: 'RECOVERY_SPECIALIST', name: 'Alex Recovery', physiology: 16 },
          { type: 'PASSER_TRAINER', name: 'Sarah Passer', teaching: 15 },
          { type: 'RUNNER_TRAINER', name: 'Mike Runner', teaching: 14 },
          { type: 'BLOCKER_TRAINER', name: 'Lisa Blocker', teaching: 15 },
          { type: 'SCOUT', name: 'Emma Talent', talentIdentification: 16, potentialAssessment: 15 },
          { type: 'SCOUT', name: 'Tony Scout', talentIdentification: 14, potentialAssessment: 15 }
        ];

        for (const staffData of defaultStaff) {
          await storage.staff.createStaff({
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
          staffCreated++;
        }
      }
      
      results.push({
        team: team.name,
        playersCreated,
        staffCreated,
        wasEmpty: !hasPlayers && !hasStaff
      });
    }
    
    res.json({
      success: true,
      message: `Processed ${teams.length} teams`,
      results,
      summary: results.filter(r => r.wasEmpty).length + ' teams populated'
    });
    
  } catch (error) {
    console.error('Error populating all teams:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// PRODUCTION: Clear user data for fresh team creation testing
router.post('/clear-user-data', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    console.log(`🗑️ Clearing all data for user: ${userId}`);
    
    // Find user profile
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: userId }
    });
    
    if (!userProfile) {
      return res.status(404).json({ error: `User profile for ${userId} not found` });
    }
    
    // Find user's team
    const team = await prisma.team.findFirst({
      where: { userProfileId: userProfile.id }
    });
    
    let deletedItems = {
      contracts: 0,
      players: 0,
      staff: 0,
      finances: 0,
      stadium: 0,
      team: 0,
      userProfile: 0
    };
    
    if (team) {
      console.log(`🗑️ Found team: ${team.name} (ID: ${team.id})`);
      
      // Delete in correct order due to foreign key constraints
      const deletedContracts = await prisma.contract.deleteMany({ 
        where: { player: { teamId: team.id } } 
      });
      deletedItems.contracts = deletedContracts.count;
      
      const deletedPlayers = await prisma.player.deleteMany({ 
        where: { teamId: team.id } 
      });
      deletedItems.players = deletedPlayers.count;
      
      const deletedStaff = await prisma.staff.deleteMany({ 
        where: { teamId: team.id } 
      });
      deletedItems.staff = deletedStaff.count;
      
      const deletedFinances = await prisma.teamFinances.deleteMany({ 
        where: { teamId: team.id } 
      });
      deletedItems.finances = deletedFinances.count;
      
      const deletedStadium = await prisma.stadium.deleteMany({ 
        where: { teamId: team.id } 
      });
      deletedItems.stadium = deletedStadium.count;
      
      await prisma.team.delete({ where: { id: team.id } });
      deletedItems.team = 1;
    }
    
    // Delete user profile
    await prisma.userProfile.delete({ where: { id: userProfile.id } });
    deletedItems.userProfile = 1;
    
    console.log(`✅ User data cleared:`, deletedItems);
    
    res.json({
      success: true,
      message: `All data cleared for user ${userId}`,
      deletedItems,
      instructions: "User can now log in fresh and create a new team with automatic roster generation"
    });
    
  } catch (error) {
    console.error('Error clearing user data:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// PRODUCTION: Delete team and all related data for clean testing
router.post('/delete-team', async (req: Request, res: Response) => {
  try {
    const { teamName } = req.body;
    
    if (!teamName) {
      return res.status(400).json({ error: 'teamName is required' });
    }
    
    // Find the team
    const team = await prisma.team.findFirst({
      where: { 
        name: { 
          contains: teamName,
          mode: 'insensitive'
        }
      }
    });
    
    if (!team) {
      return res.status(404).json({ error: `Team "${teamName}" not found` });
    }
    
    console.log(`🗑️ Deleting team: ${team.name} (ID: ${team.id})`);
    
    // Delete in correct order due to foreign key constraints
    await prisma.contract.deleteMany({ where: { player: { teamId: team.id } } });
    await prisma.player.deleteMany({ where: { teamId: team.id } });
    await prisma.staff.deleteMany({ where: { teamId: team.id } });
    await prisma.teamFinances.deleteMany({ where: { teamId: team.id } });
    await prisma.stadium.deleteMany({ where: { teamId: team.id } });
    await prisma.team.delete({ where: { id: team.id } });
    
    console.log(`✅ Team "${team.name}" and all related data deleted`);
    
    res.json({
      success: true,
      message: `Team "${team.name}" deleted successfully`,
      deletedTeam: {
        id: team.id,
        name: team.name
      }
    });
    
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;