import { getPrismaClient } from '../database.js';
import { PrismaClient, Team, Race } from "@prisma/client";
import { PaymentHistoryService } from '../services/paymentHistoryService.js';

// Greek alphabet subdivision names for proper subdivision assignment
const GREEK_ALPHABET = [
  "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta",
  "iota", "kappa", "lambda", "mu", "nu", "xi", "omicron", "pi",
  "rho", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega"
];

/**
 * Get the default subdivision name for a given division
 * Uses Greek alphabet naming system instead of hardcoded "main"
 */
async function getDefaultSubdivision(division: number): Promise<string> {
  const prisma = await getPrismaClient();
  
  // For late signup system (Division 8), use the late signup logic
  if (division === 8) {
    // Check if there are any existing teams and their subdivisions
    const existingTeams = await prisma.team.findMany({
      where: { division: 8 },
      select: { subdivision: true }
    });
    
    if (existingTeams.length === 0) {
      return "alpha"; // First team gets alpha
    }
    
    // Count teams per subdivision
    const subdivisionCounts = existingTeams.reduce((acc, team) => {
      const subdivision = team.subdivision || "alpha";
      acc[subdivision] = (acc[subdivision] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Find first subdivision with less than 8 teams
    for (const baseName of GREEK_ALPHABET) {
      if ((subdivisionCounts[baseName] || 0) < 8) {
        return baseName;
      }
    }
    
    // If all base names are full, try numbered extensions
    for (const baseName of GREEK_ALPHABET) {
      for (let i = 1; i <= 100; i++) {
        const numberedName = `${baseName}_${i}`;
        if ((subdivisionCounts[numberedName] || 0) < 8) {
          return numberedName;
        }
      }
    }
    
    // Fallback to overflow pattern
    const overflowId = Date.now().toString().slice(-6);
    return `overflow_${overflowId}`;
  }
  
  // For other divisions, find the first available subdivision
  const existingTeams = await prisma.team.findMany({
    where: { division },
    select: { subdivision: true }
  });
  
  if (existingTeams.length === 0) {
    return "alpha"; // First team gets alpha
  }
  
  // Count teams per subdivision
  const subdivisionCounts = existingTeams.reduce((acc, team) => {
    const subdivision = team.subdivision || "alpha";
    acc[subdivision] = (acc[subdivision] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Find first subdivision with less than 8 teams (standard subdivision size)
  for (const baseName of GREEK_ALPHABET) {
    if ((subdivisionCounts[baseName] || 0) < 8) {
      return baseName;
    }
  }
  
  // If all base names are full, try numbered extensions
  for (const baseName of GREEK_ALPHABET) {
    for (let i = 1; i <= 100; i++) {
      const numberedName = `${baseName}_${i}`;
      if ((subdivisionCounts[numberedName] || 0) < 8) {
        return numberedName;
      }
    }
  }
  
  // Fallback to overflow pattern
  const overflowId = Date.now().toString().slice(-6);
  return `overflow_${overflowId}`;
}

// Helper function to serialize BigInt fields to strings for JSON compatibility
function serializeTeamFinances(finances: any): any {
  if (!finances) return null;
  
  return {
    ...finances,
    credits: finances.credits?.toString() || '0',
    gems: finances.gems?.toString() || '0',
    escrowCredits: finances.escrowCredits?.toString() || '0',
    escrowGems: finances.escrowGems?.toString() || '0',
    projectedIncome: finances.projectedIncome?.toString() || '0',
    projectedExpenses: finances.projectedExpenses?.toString() || '0',
    lastSeasonRevenue: finances.lastSeasonRevenue?.toString() || '0',
    lastSeasonExpenses: finances.lastSeasonExpenses?.toString() || '0',
    facilitiesMaintenanceCost: finances.facilitiesMaintenanceCost?.toString() || '0',
  };
}

// Helper function to serialize full team data including BigInt fields
async function serializeTeamData(team: any): Promise<any> {
  if (!team) return null;
  
  // If we have players but no contract data included, fetch it separately
  let playersWithContracts = team.players || [];
  
  if (team.players && team.players.length > 0 && !team.players[0].contract) {
    // Fetch contracts for all players in this team
    const prisma = await getPrismaClient();
    const playerIds = team.players.map((p: any) => p.id);
    const contracts = await prisma.contract.findMany({
      where: { playerId: { in: playerIds } }
    });
    
    // Create a map for quick lookup
    const contractMap = new Map(contracts.map((c: any) => [c.playerId, c]));
    
    // Add contract data to each player
    playersWithContracts = team.players.map((player: any) => ({
      ...player,
      contract: contractMap.get(player.id) || null
    }));
  }
  
  return {
    ...team,
    finances: serializeTeamFinances(team.finances),
    playersCount: playersWithContracts.length,
    players: playersWithContracts.map((player: any) => ({
      ...player,
      // Flatten contract information into player object
      contractSalary: player.contract ? Number(player.contract.salary.toString()) : 0,
      contractLength: player.contract ? player.contract.length : 0,
      contractStartDate: player.contract ? player.contract.startDate : null,
      contractSigningBonus: player.contract ? parseInt(player.contract.signingBonus?.toString() || '0') : 0,
    }))
  };
}

export class TeamStorage {
  async createTeam(teamData: {
    name: string;
    userId: string;
    division?: number;
    subdivision?: string;
  }): Promise<Team> {
    const prisma = await getPrismaClient();
    
    // Find or create UserProfile by userId for foreign key relationship
    let userProfile = await prisma.userProfile.findUnique({
      where: { userId: teamData.userId }
    });
    
    if (!userProfile) {
      console.log('🔧 Creating new UserProfile for userId:', teamData.userId);
      // Create a new UserProfile if it doesn't exist
      userProfile = await prisma.userProfile.create({
        data: {
          userId: teamData.userId,
          ndaAccepted: true, // Since they're creating a team, they've accepted the NDA
          ndaAcceptedAt: new Date(),
          ndaVersion: "1.0"
        }
      });
      console.log('✅ UserProfile created with id:', userProfile.id);
    }
    
    const newTeam = await prisma.team.create({
      data: {
        name: teamData.name,
        userProfileId: userProfile.id, // Use the UserProfile's id, not the userId
        division: teamData.division || 8,
        subdivision: teamData.subdivision || await getDefaultSubdivision(teamData.division || 8),
        camaraderie: 50.0,
        fanLoyalty: 50.0,
        isAI: false, // Human team by default
      },
      include: {
        finances: true,
        stadium: true,
        players: true,
        staff: true
      }
    });

    // Create default finances and stadium
    await this.createDefaultFinancesForTeam(newTeam.id);
    await this.createDefaultStadiumForTeam(newTeam.id);

    // Generate starter players and staff
    await this.generateStarterRoster(newTeam.id);
    await this.generateStarterStaff(newTeam.id);

    // Record the initial team creation transaction for 50,000 credits
    try {
      await PaymentHistoryService.recordTransaction({
        userId: teamData.userId,
        teamId: newTeam.id,
        transactionType: "admin_grant",
        itemType: "credits",
        itemName: "New team creation",
        creditsAmount: BigInt(50000),
        gemsAmount: 0,
        status: "completed",
        metadata: {
          reason: "Initial team bonus",
          teamName: newTeam.name
        }
      });
      console.log('✅ Team creation transaction recorded: +50,000 credits');
    } catch (error: any) {
      console.error('❌ Failed to record team creation transaction:', error?.message || error);
    }

    return newTeam;
  }

  /**
   * FIXED: Create AI team with proper AI flag and unique userId
   */
  async createAITeam(teamData: {
    name: string;
    userId: string;
    division?: number;
    subdivision?: string;
  }): Promise<Team> {
    const prisma = await getPrismaClient();
    
    // Find or create UserProfile by userId for AI team
    let userProfile = await prisma.userProfile.findUnique({
      where: { userId: teamData.userId }
    });
    
    if (!userProfile) {
      console.log('🔧 Creating new AI UserProfile for userId:', teamData.userId);
      // Create a new UserProfile for AI team
      userProfile = await prisma.userProfile.create({
        data: {
          userId: teamData.userId,
          ndaAccepted: true,
          ndaAcceptedAt: new Date(),
          ndaVersion: "1.0",
          // AI profiles get minimal data
          firstName: "AI",
          lastName: "Team"
        }
      });
      console.log('✅ AI UserProfile created with id:', userProfile.id);
    }
    
    const newTeam = await prisma.team.create({
      data: {
        name: teamData.name,
        userProfileId: userProfile.id,
        division: teamData.division || 8,
        subdivision: teamData.subdivision || await getDefaultSubdivision(teamData.division || 8),
        camaraderie: 50.0,
        fanLoyalty: 50.0,
        isAI: true, // Mark as AI team
      },
      include: {
        finances: true,
        stadium: true,
        players: true,
        staff: true
      }
    });

    // Create default finances and stadium for AI team
    await this.createDefaultFinancesForTeam(newTeam.id);
    await this.createDefaultStadiumForTeam(newTeam.id);

    // AI teams don't get the 50,000 credit bonus
    console.log(`✅ AI team created: ${newTeam.name}`);

    return newTeam;
  }

  async getTeamByUserId(userId: string): Promise<any> {
    // First find the UserProfile by userId, then find the team by userProfileId
    if (!userId) {
      return null;
    }
    
    try {
      const prisma = await getPrismaClient();
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId: userId }
      });
    
      if (!userProfile) {
        return null;
      }
      
      const team = await prisma.team.findFirst({
        where: { userProfileId: userProfile.id },
        include: {
          finances: true,
          stadium: true,
          players: {
            where: {
              isOnMarket: false,
              contract: {
                isNot: null // Only include players WITH contracts (main roster)
              }
            },
            include: {
              contract: true,
              skills: { include: { skill: true } }
            }
          },
          staff: true
        }
      });
      
      if (!team) {
        return null;
      }
      
      return await serializeTeamData(team);
    } catch (error: any) {
      console.error('❌ Database connection failed in getTeamByUserId:', error?.message || error);
      
      // Development fallback: Return null to trigger team creation flow
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.log('🔄 Development: Database unavailable, returning null to trigger team creation');
        return null;
      }
      
      throw error;
    }
  }

  async getTeamById(id: number): Promise<any> {
    if (!id) {
      throw new Error('Team ID is required');
    }
    
    try {
      const prisma = await getPrismaClient();
      const team = await prisma.team.findUnique({
        where: { 
          id: Number(id) 
        },
        include: {
          finances: true,
          stadium: true,
          players: {
            include: {
              contract: true,
              skills: { include: { skill: true } }
            }
          },
          staff: true
        }
      });
      
      if (!team) {
        return null;
      }
      
      return await serializeTeamData(team);
    } catch (error: any) {
      console.error('❌ Database connection failed in getTeamById:', error?.message || error);
      
      // Development fallback: Return null for missing team
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.log('🔄 Development: Database unavailable, returning null');
        return null;
      }
      
      throw error;
    }
  }

  async getAllTeams(): Promise<any[]> {
    try {
      const prisma = await getPrismaClient();
      const teams = await prisma.team.findMany({
        include: {
          finances: true,
          stadium: true,
          players: {
            include: {
              contract: true,
              skills: { include: { skill: true } }
            }
          },
          staff: true
        }
      });
      
      return await Promise.all(teams.map((team: any) => serializeTeamData(team)));
    } catch (error: any) {
      console.error('❌ Database connection failed in getAllTeams:', error?.message || error);
      
      // Development fallback: Return empty array
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.log('🔄 Development: Database unavailable, returning empty array');
        return [];
      }
      
      throw error;
    }
  }

  async getAllTeamsWithBasicInfo(): Promise<any[]> {
    try {
      const prisma = await getPrismaClient();
      const teams = await prisma.team.findMany({
        include: {
          finances: true,
          stadium: true,
          players: {
            include: {
              contract: true,
              skills: { include: { skill: true } }
            }
          },
          staff: true
        }
      });
      
      return await Promise.all(teams.map((team: any) => serializeTeamData(team)));
    } catch (error: any) {
      console.error('❌ Database connection failed in getAllTeamsWithBasicInfo:', error?.message || error);
      
      // Development fallback: Return empty array
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.log('🔄 Development: Database unavailable, returning empty array');
        return [];
      }
      
      throw error;
    }
  }

  async getTeamsInDivision(division: number, subdivision?: string): Promise<any[]> {
    const prisma = await getPrismaClient();
    const whereClause: any = { division: division };
    if (subdivision) {
      whereClause.subdivision = subdivision;
    }
    
    const teams = await prisma.team.findMany({
      where: whereClause,
      include: {
        finances: true,
        stadium: true,
        players: {
          include: {
            contract: true,
            skills: { include: { skill: true } }
          }
        },
        staff: true
      }
    });
    
    return await Promise.all(teams.map((team: any) => serializeTeamData(team)));
  }

  // Alias method for route compatibility
  async getTeamsByDivisionAndSubdivision(division: number, subdivision?: string): Promise<any[]> {
    return this.getTeamsInDivision(division, subdivision);
  }

  async updateTeam(teamId: number, updateData: any): Promise<any> {
    const prisma = await getPrismaClient();
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: updateData,
      include: {
        finances: true,
        stadium: true,
        players: {
          include: {
            contract: true,
            skills: { include: { skill: true } }
          }
        },
        staff: true
      }
    });
    
    return await serializeTeamData(updatedTeam);
  }

  async updateTeamRecord(teamId: number, wins: number, losses: number, points: number): Promise<void> {
    const prisma = await getPrismaClient();
    await prisma.team.update({
      where: { id: teamId },
      data: { 
        wins: wins, 
        losses: losses, 
        points: points
      }
    });
  }

  async createDefaultFinancesForTeam(teamId: number): Promise<void> {
    const prisma = await getPrismaClient();
    await prisma.teamFinances.create({
      data: {
        teamId,
        credits: 50000, // Starting credits
        gems: 0, // Starting gems (0 per specifications)
        projectedIncome: 0,
        projectedExpenses: 0,
        lastSeasonRevenue: 0,
        lastSeasonExpenses: 0,
        facilitiesMaintenanceCost: 5000
      }
    });
  }

  async generateStarterRoster(teamId: number): Promise<void> {
    // Import the generateRandomPlayer function
    const { generateRandomPlayer } = await import('../services/leagueService');
    const { storage } = await import('../storage/index');
    
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

    for (let i = 0; i < 12; i++) {
      const race = races[Math.floor(Math.random() * races.length)];
      const position = requiredPositions[i];
      
      const playerData = generateRandomPlayer("", race, teamId, position);
      
      const cleanPlayerData = {
        teamId: teamId,
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        race: playerData.race as any,
        age: playerData.age,
        role: playerData.role as any,
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
        injuryStatus: 'HEALTHY' as any,
        camaraderieScore: playerData.camaraderieScore || 75.0,
      };
      
      await storage.players.createPlayer(cleanPlayerData);
    }
  }

  async generateStarterStaff(teamId: number): Promise<void> {
    const { storage } = await import('../storage/index');
    
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
        teamId: teamId,
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
    }
  }

  async createDefaultStadiumForTeam(teamId: number): Promise<void> {
    const prisma = await getPrismaClient();
    await prisma.stadium.create({
      data: {
        teamId,
        capacity: 5000, // Starting capacity
        concessionsLevel: 1,
        parkingLevel: 1,
        vipSuitesLevel: 1,
        merchandisingLevel: 1,
        lightingScreensLevel: 1
      }
    });
  }

  async deleteTeam(teamId: number): Promise<void> {
    const prisma = await getPrismaClient();
    // Delete related records first
    await prisma.player.deleteMany({ where: { teamId: teamId } });
    await prisma.staff.deleteMany({ where: { teamId: teamId } });
    await prisma.teamFinances.deleteMany({ where: { teamId: teamId } });
    await prisma.stadium.deleteMany({ where: { teamId: teamId } });
    
    // Delete the team
    await prisma.team.delete({ where: { id: teamId } });
  }

  // World rankings method with proper BigInt serialization
  async getWorldRankings(): Promise<any> {
    const prisma = await getPrismaClient();
    const teams = await prisma.team.findMany({
      include: {
        finances: true,
        stadium: true,
        players: true,
        staff: true
      },
      orderBy: [
        { points: 'desc' },
        { wins: 'desc' },
        { name: 'asc' }
      ]
    });

    return {
      rankings: await Promise.all(teams.map((team: any) => serializeTeamData(team))),
      totalTeams: teams.length,
      totalPlayers: teams.reduce((sum: number, team: any) => sum + team.players.length, 0)
    };
  }

  // Add the missing getAllTeamsWithStats method for world rankings route compatibility
  async getAllTeamsWithStats(): Promise<any[]> {
    const rankings = await this.getWorldRankings();
    return rankings.rankings || [];
  }

  // Add missing getTeams method for exhibition routes compatibility
  async getTeams(): Promise<any[]> {
    return this.getAllTeams();
  }

  // Add missing getTeamsByDivision method
  async getTeamsByDivision(division: number): Promise<any[]> {
    const prisma = await getPrismaClient();
    const teams = await prisma.team.findMany({
      where: { division: division },
      include: {
        finances: true,
        stadium: true,
        players: {
          include: {
            contract: true,
            skills: { include: { skill: true } }
          }
        },
        staff: true
      }
    });
    
    return await Promise.all(teams.map((team: any) => serializeTeamData(team)));
  }
}

// Export instance for use in other modules
export const teamStorage = new TeamStorage();