import { DatabaseService } from "../database/DatabaseService.js";
import { randomUUID } from "crypto";
import moment from "moment-timezone";
import { PaymentHistoryService } from './enhancedEconomyService.js';
import type { Team, League } from '@shared/types/models';

// Using any types for Prisma enums to avoid import issues

export interface TournamentReward {
  credits: number;
  gems: number;
  trophy?: number;
}

export interface TournamentConfig {
  type: "DAILY_DIVISIONAL" | "MID_SEASON_CLASSIC";
  division: number;
  season: number;
  gameDay?: number;
  entryFeeCredits?: number;
  entryFeeGems?: number;
  requiresEntryItem?: boolean;
  maxTeams: number;
  rewards: {
    champion: TournamentReward;
    runnerUp: TournamentReward;
    semifinalist?: TournamentReward;
  };
}

export class TournamentService {
  
  // Daily Division Tournament reward structure (divisions 2-8)
  private getDailyDivisionTournamentRewards(division: number): TournamentConfig["rewards"] {
    const rewardTable: Record<number, TournamentConfig["rewards"]> = {
      5: { // Division 5-8 (Lower Divisions)
        champion: { credits: 5000, gems: 0, items: ["advanced_recovery_serum"] },
        runnerUp: { credits: 2000, gems: 0, items: [] }
      },
      6: { 
        champion: { credits: 5000, gems: 0, items: ["advanced_recovery_serum"] },
        runnerUp: { credits: 2000, gems: 0, items: [] }
      },
      7: { 
        champion: { credits: 5000, gems: 0, items: ["advanced_recovery_serum"] },
        runnerUp: { credits: 2000, gems: 0, items: [] }
      },
      8: { 
        champion: { credits: 5000, gems: 0, items: ["advanced_recovery_serum"] },
        runnerUp: { credits: 2000, gems: 0, items: [] }
      },
      1: { // Division 1-4 (Upper Divisions)  
        champion: { credits: 10000, gems: 0, items: ["advanced_treatment"] },
        runnerUp: { credits: 4000, gems: 0, items: [] }
      },
      2: {
        champion: { credits: 10000, gems: 0, items: ["advanced_treatment"] },
        runnerUp: { credits: 4000, gems: 0, items: [] }
      },
      3: {
        champion: { credits: 10000, gems: 0, items: ["advanced_treatment"] },
        runnerUp: { credits: 4000, gems: 0, items: [] }
      },
      4: {
        champion: { credits: 10000, gems: 0, items: ["advanced_treatment"] },
        runnerUp: { credits: 4000, gems: 0, items: [] }
      }
    };
    return rewardTable[division] || rewardTable[8];
  }

  // Mid-Season Cup reward structure (all divisions)
  getMidSeasonCupRewards(division: number): { credits: number; gems: number } {
    // Mid-Season Cup rewards based on division
    const rewardTiers = {
      1: { credits: 750000, gems: 300 },  // Division 1 Champion
      2: { credits: 600000, gems: 250 },  // Division 2 Champion  
      3: { credits: 450000, gems: 200 },  // Division 3 Champion
      4: { credits: 350000, gems: 150 },  // Division 4 Champion
      5: { credits: 275000, gems: 125 },  // Division 5 Champion
      6: { credits: 200000, gems: 100 },  // Division 6 Champion
      7: { credits: 125000, gems: 75 },   // Division 7 Champion
      8: { credits: 75000, gems: 50 }     // Division 8 Champion
    };

    return rewardTiers[division] || { credits: 50000, gems: 25 }; // Fallback for invalid divisions
  }

  // Get current season number based on 17-day cycles
  private getCurrentSeason(): number {
    const startDate = new Date("2025-07-13");
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.floor(daysSinceStart / 17);
  }

  // Get current game day (1-17 within season)
  private getCurrentGameDay(): number {
    const startDate = new Date("2025-07-13");
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return (daysSinceStart % 17) + 1;
  }

  // Generate tournament ID in format: Season-Division-GameDay-Sequential (e.g., 0841)
  private async generateTournamentId(season: number, division: number, gameDay: number): Promise<string> {
    const prisma = await DatabaseService.getInstance();
    // Get count of tournaments created today for this division to determine sequential number
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const todayTournamentCount = await prisma.tournament.count({
      where: {
        division: division,
        seasonDay: gameDay,
        createdAt: {
          gte: startOfDay
        }
      }
    });
    
    const sequential = todayTournamentCount + 1;
    
    // Format: Season(1 digit) + Division(1 digit) + GameDay(1 digit) + Sequential(1 digit)
    // Example: Season 0, Division 8, Day 4, Tournament 1 = "0841"
    const seasonDigit = season % 10;
    const divisionDigit = division % 10;
    const gameDayDigit = gameDay % 10;
    const sequentialDigit = sequential % 10;
    
    return `${seasonDigit}${divisionDigit}${gameDayDigit}${sequentialDigit}`;
  }

  // Generate Mid-Season Cup ID in format: Season-Division-UniqueIdentifier (e.g., 0881)
  private async generateMidSeasonCupId(season: number, division: number): Promise<string> {
    const prisma = await DatabaseService.getInstance();
    // Get count of Mid-Season Cup tournaments created this season for this division
    const midSeasonCupCount = await prisma.tournament.count({
      where: {
        division: division,
        type: "MID_SEASON_CLASSIC",
        seasonDay: 7
      }
    });
    
    const uniqueIdentifier = midSeasonCupCount + 1;
    
    // Format: Season(1 digit) + Division(1 digit) + UniqueIdentifier(1 digit)
    // Example: Season 0, Division 8, Tournament 1 = "0881"
    const seasonDigit = season % 10;
    const divisionDigit = division % 10;
    const identifierDigit = uniqueIdentifier % 10;
    
    return `${seasonDigit}${divisionDigit}${identifierDigit}1`;
  }

  // Create Daily Division Tournament
  async createDailyDivisionTournament(division: number): Promise<string> {
    const prisma = await DatabaseService.getInstance();
    if (division === 1) {
      throw new Error("Division 1 (Diamond) does not have Daily Division Tournaments");
    }

    const season = this.getCurrentSeason();
    const gameDay = this.getCurrentGameDay();
    const rewards = this.getDailyDivisionTournamentRewards(division);
    
    const divisionNames = ["", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Copper", "Iron", "Stone"];
    const tournamentName = `${divisionNames[division]} Daily Division Tournament`;
    
    // Generate tournament ID (Season-Division-GameDay-Sequential format)
    const tournamentId = await this.generateTournamentId(season, division, gameDay);

    const tournament = {
      name: tournamentName,
      tournamentId: tournamentId,
      type: "DAILY_DIVISIONAL" as const,
      division,
      seasonDay: gameDay,
      entryFeeCredits: BigInt(0),
      entryFeeGems: 0,
      status: "REGISTRATION_OPEN" as const,
      prizePoolJson: rewards as any,
      registrationEndTime: moment.tz("America/New_York").add(60, 'minutes').toDate(), // 60 minutes after creation
      startTime: moment.tz("America/New_York").add(60, 'minutes').toDate(),
    };

    const created = await prisma.tournament.create({
      data: tournament
    });
    return created.id.toString();
  }

  // Get Mid-Season Cup entry fees based on division
  private getMidSeasonCupEntryFees(division: number): { credits: number; gems: number } {
    // Divisions 1-4 (Diamond, Platinum, Gold, Silver): 7500₡ OR 20💎
    // Divisions 5-8 (Bronze, Copper, Iron, Stone): 1500₡ OR 10💎
    if (division >= 1 && division <= 4) {
      return { credits: 7500, gems: 20 };
    } else {
      return { credits: 1500, gems: 10 };
    }
  }

  // Create Mid-Season Cup tournament
  async createMidSeasonCup(division: number): Promise<string> {
    const prisma = await DatabaseService.getInstance();
    const season = this.getCurrentSeason();
    const gameDay = 7; // Always Day 7
    const rewards = this.getMidSeasonCupRewards(division);
    const entryFees = this.getMidSeasonCupEntryFees(division);
    
    const divisionNames = ["", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Copper", "Iron", "Stone"];
    const tournamentName = `${divisionNames[division]} Mid-Season Cup - Season ${season}`;
    
    // Generate tournament ID for Mid-Season Cup (Season-Division-UniqueIdentifier format)
    const tournamentId = await this.generateMidSeasonCupId(season, division);

    const tournament = {
      name: tournamentName,
      tournamentId: tournamentId,
      type: "MID_SEASON_CLASSIC" as const, // Use MID_SEASON_CLASSIC to match the existing logic
      division,
      seasonDay: 7,
      entryFeeCredits: BigInt(entryFees.credits),
      entryFeeGems: entryFees.gems,
      status: "REGISTRATION_OPEN" as const,
      prizePoolJson: rewards as any,
      registrationEndTime: moment.tz("America/New_York").endOf('day').toDate(), // End of Day 6
      startTime: moment.tz("America/New_York").add(1, 'day').hour(13).minute(0).toDate() // 1 PM EST Day 7
    };

    const created = await prisma.tournament.create({
      data: tournament
    });
    return created.id.toString();
  }

  // Fill Mid-Season Cup with AI teams if needed at 1PM on Day 7
  async fillMidSeasonCupWithAI(tournamentId: number): Promise<void> {
    const prisma = await DatabaseService.getInstance();
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { entries: true }
    });

    if (!tournament || tournament.type !== "MID_SEASON_CLASSIC") {
      return;
    }

    const currentEntries = tournament.entries.length;
    const maxParticipants = 16;
    const spotsToFill = Math.min(maxParticipants - currentEntries, maxParticipants);

    if (spotsToFill <= 0) {
      return; // Tournament is full or no spots to fill
    }

    // Get existing participating team IDs
    const existingTeamIds = tournament.entries.map((entry: any) => entry.teamId);

    // Find AI teams in the same division that aren't already participating
    const aiTeams = await prisma.team.findMany({
      where: {
        division: tournament.division,
        isAI: true,
        id: {
          notIn: existingTeamIds
        }
      },
      take: spotsToFill
    });

    // If we don't have enough AI teams, create them
    if (aiTeams.length < spotsToFill) {
      const teamsToCreate = spotsToFill - aiTeams.length;
      await this.createAITeamsForMidSeasonCup(tournament.division || 8, teamsToCreate);

      // Re-fetch AI teams after creation
      const newAiTeams = await prisma.team.findMany({
        where: {
          division: tournament.division,
          isAI: true,
          id: {
            notIn: existingTeamIds
          }
        },
        take: spotsToFill
      });

      // Create tournament entries for AI teams
      const aiEntries = newAiTeams.map((team: any) => ({
        tournamentId: Number(tournamentId),
        teamId: team.id,
        registeredAt: new Date()
      }));

      if (aiEntries.length > 0) {
        await prisma.tournamentEntry.createMany({
          data: aiEntries
        });
      }
    } else {
      // Create tournament entries for existing AI teams
      const aiEntries = aiTeams.map((team: any) => ({
        tournamentId: Number(tournamentId),
        teamId: team.id,
        registeredAt: new Date()
      }));

      if (aiEntries.length > 0) {
        await prisma.tournamentEntry.createMany({
          data: aiEntries
        });
      }
    }
  }

  // Create AI teams specifically for Mid-Season Cup
  async createAITeamsForMidSeasonCup(division: number, count: number): Promise<void> {
    const prisma = await DatabaseService.getInstance();
    const aiTeamNames = [
      'Shadow Runners', 'Storm Breakers', 'Iron Wolves', 'Fire Hawks',
      'Thunder Eagles', 'Crimson Tide', 'Golden Lions', 'Silver Falcons',
      'Lightning Bolts', 'Frost Giants', 'Ember Knights', 'Wind Dancers',
      'Steel Warriors', 'Flame Guardians', 'Night Stalkers', 'Dawn Riders',
      'Viper Squad', 'Phoenix Rising', 'Titan Force', 'Draco Elite'
    ];

    const races = ["Human", "Sylvan", "Gryll", "Lumina", "Umbra"];
    const positions = ["PASSER", "PASSER", "PASSER", "RUNNER", "RUNNER", "RUNNER", "RUNNER", "BLOCKER", "BLOCKER", "BLOCKER", "BLOCKER", "BLOCKER"];

    for (let i = 0; i < count; i++) {
      const teamName = aiTeamNames[i % aiTeamNames.length] + ` ${Math.floor(Math.random() * 900) + 100}`;
      
      try {
        // Create AI user profile
        const aiUser = await prisma.userProfile.create({
          data: {
            userId: `ai_midseason_${Date.now()}_${i}`,
            email: `ai_midseason_${Date.now()}_${i}@realmrivalry.ai`,
            firstName: "AI",
            lastName: "Coach"
          }
        });

        // Create AI team
        const aiTeam = await prisma.team.create({
          data: {
            name: teamName,
            userProfileId: aiUser.id,
            division: division,
            subdivision: "alpha",
            isAI: true,
            wins: Math.floor(Math.random() * 3),
            losses: Math.floor(Math.random() * 3),
            points: Math.floor(Math.random() * 10),
            camaraderie: 50 + Math.floor(Math.random() * 40)
          }
        });

        // Create team finances
        await prisma.teamFinances.create({
          data: {
            teamId: aiTeam.id,
            credits: BigInt(50000 + Math.floor(Math.random() * 50000)),
            gems: Math.floor(Math.random() * 200) + 50
          }
        });

        // Create team stadium
        await prisma.stadium.create({
          data: {
            teamId: aiTeam.id,
            capacity: 15000,
            concessionsLevel: 1,
            parkingLevel: 1,
            vipSuitesLevel: 1,
            merchandisingLevel: 1,
            lightingScreensLevel: 1
          }
        });

        // Generate 12 players for AI team
        for (let j = 0; j < 12; j++) {
          const race = races[Math.floor(Math.random() * races.length)];
          const position = positions[j];
          const { firstName, lastName } = this.generateRandomName(race);

          await prisma.player.create({
            data: {
              teamId: aiTeam.id,
              firstName,
              lastName,
              race: race as any,
              role: position as any,
              age: 18 + Math.floor(Math.random() * 17),
              speed: 20 + Math.floor(Math.random() * 15),
              power: 20 + Math.floor(Math.random() * 15),
              throwing: 20 + Math.floor(Math.random() * 15),
              catching: 20 + Math.floor(Math.random() * 15),
              kicking: 20 + Math.floor(Math.random() * 15),
              staminaAttribute: 20 + Math.floor(Math.random() * 15),
              leadership: 20 + Math.floor(Math.random() * 15),
              agility: 20 + Math.floor(Math.random() * 15),
              potentialRating: 1 + Math.floor(Math.random() * 4)
            }
          });
        }

        console.log(`Created AI team: ${teamName} for Mid-Season Cup in division ${division}`);
      } catch (error) {
        console.error(`Failed to create AI team ${teamName}:`, error);
      }
    }
  }

  // Generate random name for AI players
  generateRandomName(race: string): { firstName: string; lastName: string } {
    const names = {
      human: {
        first: ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Drew", "Sage", "Quinn"],
        last: ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]
      },
      sylvan: {
        first: ["Aelindra", "Thalorin", "Eleryn", "Silvyr", "Caelum", "Lyralei", "Theren", "Aerdrie", "Solanor", "Varis"],
        last: ["Moonwhisper", "Starweaver", "Nightbreeze", "Dawnblade", "Silverleaf", "Goldenheart", "Swiftarrow", "Brightwind", "Stormcaller", "Firewalker"]
      },
      gryll: {
        first: ["Thorgrim", "Balin", "Dain", "Thorin", "Gimli", "Gloin", "Oin", "Nori", "Ori", "Dori"],
        last: ["Ironforge", "Stonebreaker", "Hammerfall", "Goldbeard", "Rockfist", "Steelheart", "Ironshield", "Stonehammer", "Battleaxe", "Deepdelver"]
      },
      lumina: {
        first: ["Seraphiel", "Auriel", "Raphael", "Gabriel", "Uriel", "Raziel", "Camael", "Jophiel", "Zadkiel", "Raguel"],
        last: ["Lightbringer", "Dawnhammer", "Goldenwing", "Sunblade", "Radiance", "Holyfire", "Celestial", "Divinity", "Sanctity", "Purity"]
      },
      umbra: {
        first: ["Shadowmere", "Nyx", "Vex", "Shade", "Raven", "Onyx", "Sable", "Dusk", "Midnight", "Eclipse"],
        last: ["Darkbane", "Shadowstep", "Nightfall", "Voidwalker", "Blackthorn", "Darkheart", "Shadowblade", "Nightwhisper", "Voidcaller", "Duskbringer"]
      }
    };

    const raceNames = names[race.toLowerCase() as keyof typeof names] || names.human;
    const firstName = raceNames.first[Math.floor(Math.random() * raceNames.first.length)];
    const lastName = raceNames.last[Math.floor(Math.random() * raceNames.last.length)];

    return { firstName, lastName };
  }

  // Ensure tournaments exist for current day and division
  async ensureTournamentsExist(division: number): Promise<void> {
    const prisma = await DatabaseService.getInstance();
    const season = this.getCurrentSeason();
    const gameDay = this.getCurrentGameDay();

    // Check if Daily Division Tournament exists for this division and day
    if (division >= 2 && division <= 8) {
      const existingDailyCup = await prisma.tournament.findFirst({
        where: {
          type: "DAILY_DIVISIONAL",
          division,
          seasonDay: gameDay
        }
      });

      if (!existingDailyCup) {
        try {
          await this.createDailyDivisionTournament(division);
          console.log(`Created Daily Division Tournament for Division ${division}, Day ${gameDay}`);
        } catch (error) {
          console.error(`Failed to create Daily Division Tournament for Division ${division}:`, error);
        }
      }
    }

    // Check if Mid-Season Cup exists for this division (only create on Day 1-6)
    if (gameDay <= 6) {
      const existingMidSeason = await prisma.tournament.findFirst({
        where: {
          type: "MID_SEASON_CLASSIC",
          division,
          seasonDay: 7
        }
      });

      if (!existingMidSeason) {
        try {
          await this.createMidSeasonCup(division);
          console.log(`Created Mid-Season Cup for Division ${division}, Season ${season}`);
        } catch (error) {
          console.error(`Failed to create Mid-Season Cup for Division ${division}:`, error);
        }
      }
    }
  }

  // Get available tournaments for a team
  async getAvailableTournaments(teamId: number | string) {
    const prisma = await DatabaseService.getInstance();
    const numericTeamId = typeof teamId === 'string' ? parseInt(teamId) : teamId;
    const team = await prisma.team.findFirst({
      where: { id: numericTeamId }
    });
    if (!team) throw new Error("Team not found");

    const division = team.division;
    const season = this.getCurrentSeason();
    const gameDay = this.getCurrentGameDay();

    // Get open tournaments for this division and season
    const availableTournaments = await prisma.tournament.findMany({
      where: {
        division: division,
        status: "REGISTRATION_OPEN"
      },
      orderBy: {
        registrationEndTime: 'asc'
      }
    });

    // Check if team is already registered for any tournaments
    const existingEntries = await prisma.tournamentEntry.findMany({
      where: { teamId: numericTeamId },
      select: { tournamentId: true }
    });

    const registeredTournamentIds = new Set(existingEntries.map((e: any) => e.tournamentId));

    return availableTournaments.filter((t: any) => !registeredTournamentIds.has(t.id));
  }

  // Register team for tournament
  async registerForTournament(teamId: number, tournamentId: number, paymentType?: "credits" | "gems" | "both"): Promise<void> {
    const prisma = await DatabaseService.getInstance();
    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId }
    });
    if (!tournament) throw new Error("Tournament not found");

    const team = await prisma.team.findFirst({
      where: { id: teamId }
    });
    if (!team) throw new Error("Team not found");

    // Check if registration is still open
    if (new Date() > tournament.registrationEndTime!) {
      throw new Error("Registration deadline has passed");
    }

    // Check if team is in correct division
    if (team.division !== tournament.division) {
      throw new Error("Team is not in the correct division for this tournament");
    }

    // Check entry requirements
    if (tournament.id) {
      // Daily Division Tournament - check if already registered
      const existingEntry = await prisma.tournamentEntry.findFirst({
        where: {
          teamId: teamId,
          tournamentId: tournament.id
        }
      });

      if (existingEntry) {
        throw new Error("Team is already registered for this tournament");
      }

      // Create tournament entry for Daily Division Tournament (free entry)
      await prisma.tournamentEntry.create({
        data: {
          tournamentId: tournament.id,
          teamId: teamId,
          registeredAt: new Date()
        }
      });

      // Log Daily Division Tournament entry
      const teamWithUser = await prisma.team.findUnique({
        where: { id: teamId }
      });
      if (teamWithUser?.userProfileId) {
        await PaymentHistoryService.recordItemPurchase(
          teamWithUser.userProfileId.toString(),
          teamId.toString(),
          "Daily Division Tournament Entry",
          "0",
          0
        );
      }

      // Check if tournament is now full and start countdown if needed
      const entriesCount = await prisma.tournamentEntry.count({
        where: { tournamentId: tournament.id }
      });

      if (entriesCount >= 8) {
        // Tournament is full, start 10-minute countdown
        try {
          const { tournamentFlowService } = await import('./tournamentFlowService');
          tournamentFlowService.startTournamentCountdown(tournament.id);
          console.log(`Tournament ${tournament.id} is full - started 10-minute countdown`);
        } catch (error) {
          console.error(`Error starting tournament countdown for tournament ${tournament.id}:`, error);
        }
      }

      return; // Exit early for Daily Division Tournament
    } else {
      // Mid-Season Cup - requires credits, gems, or both
      const entryFeeCredits = tournament.entryFeeCredits || 0;
      const entryFeeGems = tournament.entryFeeGems || 0;
      
      const teamFinances = await prisma.teamFinances.findUnique({
        where: { teamId: teamId }
      });
      const teamCredits = Number(teamFinances?.credits || 0);
      const teamGems = teamFinances?.gems || 0;
      
      if (paymentType === "both") {
        // Require BOTH credits and gems
        if (teamCredits < entryFeeCredits || teamGems < entryFeeGems) {
          throw new Error("Insufficient credits AND gems for entry fee");
        }
        // Charge both
        await prisma.teamFinances.update({
          where: { teamId: Number(teamId) },
          data: { 
            credits: BigInt(Number(teamCredits) - Number(entryFeeCredits)),
            gems: teamGems - entryFeeGems 
          }
        });
      } else if (paymentType === "credits" && teamCredits >= entryFeeCredits) {
        // Pay with credits only
        await prisma.teamFinances.update({
          where: { teamId: Number(teamId) },
          data: { credits: BigInt(Number(teamCredits) - Number(entryFeeCredits)) }
        });
      } else if (paymentType === "gems" && teamGems >= entryFeeGems) {
        // Pay with gems only
        await prisma.teamFinances.update({
          where: { teamId: Number(teamId) },
          data: { gems: teamGems - entryFeeGems }
        });
      } else {
        // Legacy: try credits first, then gems (backwards compatibility)
        if (teamCredits >= entryFeeCredits) {
          await prisma.teamFinances.update({
            where: { teamId: Number(teamId) },
            data: { credits: BigInt(Number(teamCredits) - Number(entryFeeCredits)) }
          });
        } else if (teamGems >= entryFeeGems) {
          await prisma.teamFinances.update({
            where: { teamId: Number(teamId) },
            data: { gems: teamGems - entryFeeGems }
          });
        } else {
          throw new Error("Insufficient credits or gems for entry fee");
        }
      }
    }

    // Check if team is already registered (Mid-Season Cup)
    const existingEntry = await prisma.tournamentEntry.findFirst({
      where: {
        tournamentId,
        teamId
      }
    });

    if (existingEntry) {
      throw new Error("You are already registered for this tournament");
    }

    // Create tournament entry (Mid-Season Cup)
    await prisma.tournamentEntry.create({
      data: {
        tournamentId,
        teamId,
        registeredAt: new Date()
      }
    });

    // Check if tournament is now full and start countdown if needed
    const entriesCount = await prisma.tournamentEntry.count({
      where: { tournamentId }
    });

    if (entriesCount >= 8) {
      // Tournament is full, start 10-minute countdown
      try {
        const { tournamentFlowService } = await import('./tournamentFlowService');
        tournamentFlowService.startTournamentCountdown(tournamentId);
        console.log(`Tournament ${tournamentId} is full - started 10-minute countdown`);
      } catch (error) {
        console.error(`Error starting tournament countdown for tournament ${tournamentId}:`, error);
      }
    }
  }

  // Get tournaments a team is registered for
  async getTeamTournaments(teamId: number) {
    const prisma = await DatabaseService.getInstance();
    const entries = await prisma.tournamentEntry.findMany({
      where: { teamId },
      include: { tournament: true },
      orderBy: { registeredAt: 'desc' }
    });

    return entries;
  }

  // Get tournament history for a team
  async getTournamentHistory(teamId: number) {
    const prisma = await DatabaseService.getInstance();
    const completedTournaments = await prisma.tournamentEntry.findMany({
      where: {
        teamId,
        tournament: { status: "COMPLETED" }
      },
      include: { tournament: true },
      orderBy: { tournament: { startTime: 'desc' } }
    });

    return completedTournaments.map(({ tournament, ...entry }: any) => ({
      id: tournament.id,
      name: tournament.name,
      type: tournament.type,
      division: tournament.division,
      season: 1, // tournament.season not in schema yet
      placement: entry.finalRank,
      creditsWon: entry.finalRank || 0,
      gemsWon: entry.finalRank || 0,
      trophyWon: null,
      updatedAt: new Date() // tournament.completedAt not in schema yet
    }));
  }

  // Get tournament statistics for a team
  async getTournamentStats(teamId: number) {
    const prisma = await DatabaseService.getInstance();
    const entries = await prisma.tournamentEntry.findMany({
      where: { teamId: teamId }
    });

    const totalTournaments = entries.length;
    const wins = entries.filter((e: any) => e.finalRank === 1).length;
    const runnerUps = entries.filter((e: any) => e.finalRank === 2).length;
    const totalCreditsWon = entries.reduce((sum: any, e: any) => sum + (e.finalRank === 1 ? 100 : 0), 0);
    const totalGemsWon = entries.reduce((sum: any, e: any) => sum + (e.finalRank === 1 ? 10 : 0), 0);
    const trophiesWon = entries.filter((e: any) => e.finalRank === 1).length;

    return {
      totalTournaments,
      wins,
      runnerUps,
      totalCreditsWon,
      totalGemsWon,
      trophiesWon,
      winRate: totalTournaments > 0 ? (wins / totalTournaments) * 100 : 0
    };
  }

  async createOrJoinDailyTournament(teamId: number, division: number): Promise<string> {
    const prisma = await DatabaseService.getInstance();
    const gameDay = this.getCurrentGameDay();
    const season = this.getCurrentSeason();

    // ✅ FIX: Only check for TRULY active Daily tournaments (exclude completed ones)
    const existingActiveEntry = await prisma.tournamentEntry.findFirst({
      where: {
        teamId,
        tournament: {
          type: "DAILY_DIVISIONAL", // Only check Daily tournaments
          status: {
            in: ["REGISTRATION_OPEN", "IN_PROGRESS"]
          },
          division: division, // Same division only
          seasonDay: gameDay // Same day only
        }
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            type: true,
            division: true,
            status: true
          }
        }
      }
    });

    if (existingActiveEntry) {
      throw new Error(`You are already registered for ${existingActiveEntry.tournament.name} (ID: ${existingActiveEntry.tournament.id}) on Division ${existingActiveEntry.tournament.division}. Please wait for this tournament to complete.`);
    }

    // Check if tournament already exists for this division/day
    const existingTournament = await prisma.tournament.findMany({
      where: {
        division: division,
        type: "DAILY_DIVISIONAL",
        seasonDay: gameDay,
        status: "REGISTRATION_OPEN"
      },
      take: 1
    });

    let tournamentId: number;

    if (existingTournament.length > 0) {
      // Tournament exists, join it
      tournamentId = existingTournament[0].id;
    } else {
      // Create new tournament
      tournamentId = Number(await this.createDailyDivisionTournament(division));
    }

    // Register the team (this will check for entry items and handle payments)
    await this.registerForTournament(teamId, tournamentId);

    return tournamentId.toString();
  }

  async createOrJoinMidSeasonCup(teamId: number, division: number, paymentType: "credits" | "gems" | "both"): Promise<string> {
    const prisma = await DatabaseService.getInstance();
    const season = this.getCurrentSeason();

    // ✅ FIX: Only check for active Mid-Season Cups, not Daily tournaments
    const existingMidSeasonEntry = await prisma.tournamentEntry.findFirst({
      where: {
        teamId,
        tournament: {
          type: "MID_SEASON_CLASSIC", // Only check for Mid-Season Cup, not Daily Division Tournament
          status: {
            in: ["REGISTRATION_OPEN", "IN_PROGRESS"]
          }
        }
      },
      include: {
        tournament: {
          select: {
            name: true,
            type: true,
            division: true
          }
        }
      }
    });

    if (existingMidSeasonEntry) {
      throw new Error(`You are already registered for ${existingMidSeasonEntry.tournament.name} (Mid-Season Cup). Please wait for your current Mid-Season tournament to complete before registering for another.`);
    }

    // Check if tournament already exists for this division
    const existingTournament = await prisma.tournament.findMany({
      where: {
        division: division,
        type: "MID_SEASON_CLASSIC",
        seasonDay: 7,
        status: "REGISTRATION_OPEN"
      },
      take: 1
    });

    let tournamentId: number;

    if (existingTournament.length > 0) {
      // Tournament exists, join it
      tournamentId = existingTournament[0].id;
    } else {
      // Create new tournament - use createMidSeasonCup for proper implementation
      tournamentId = Number(await this.createMidSeasonCup(division));
    }

    // Handle payment based on user choice
    const team = await prisma.team.findFirst({
      where: { id: teamId }
    });
    if (!team) {
      throw new Error("Team not found");
    }

    const teamFinances = await prisma.teamFinances.findUnique({
      where: { teamId: teamId }
    });
    const teamCredits = Number(teamFinances?.credits || 0);
    const teamGems = teamFinances?.gems || 0;

    const entryFees = this.getMidSeasonCupEntryFees(team.division || 8);

    if (paymentType === "credits") {
      if (teamCredits < entryFees.credits) {
        throw new Error(`Insufficient credits for Mid-Season Cup entry (${entryFees.credits.toLocaleString()}₡ required)`);
      }
      await prisma.teamFinances.update({
        where: { teamId: Number(teamId) },
        data: { credits: BigInt(teamCredits - entryFees.credits) }
      });

      // Log Mid-Season Cup entry fee transaction
      const teamWithUser = await prisma.team.findUnique({
        where: { id: teamId }
      });
      if (teamWithUser?.userProfileId) {
        await PaymentHistoryService.recordItemPurchase(
          teamWithUser.userProfileId.toString(),
          teamId.toString(),
          "Mid-Season Cup Entry (Credits)",
          entryFees.credits.toString(),
          0
        );
      }
    } else if (paymentType === "gems") {
      if (teamGems < entryFees.gems) {
        throw new Error(`Insufficient gems for Mid-Season Cup entry (${entryFees.gems}💎 required)`);
      }
      await prisma.teamFinances.update({
        where: { teamId: Number(teamId) },
        data: { gems: teamGems - entryFees.gems }
      });

      // Log Mid-Season Cup entry fee transaction
      const teamWithUser = await prisma.team.findUnique({
        where: { id: teamId }
      });
      if (teamWithUser?.userProfileId) {
        await PaymentHistoryService.recordItemPurchase(
          teamWithUser.userProfileId.toString(),
          teamId.toString(),
          "Mid-Season Cup Entry (Gems)",
          "0",
          entryFees.gems
        );
      }
    } else if (paymentType === "both") {
      if (teamCredits < entryFees.credits || teamGems < entryFees.gems) {
        throw new Error(`Insufficient credits AND gems for Mid-Season Cup entry (${entryFees.credits.toLocaleString()}₡ AND ${entryFees.gems}💎 required)`);
      }
      await prisma.teamFinances.update({
        where: { teamId: Number(teamId) },
        data: { 
          credits: BigInt(teamCredits - entryFees.credits),
          gems: teamGems - entryFees.gems
        }
      });

      // Log Mid-Season Cup entry fee transaction
      const teamWithUser = await prisma.team.findUnique({
        where: { id: teamId }
      });
      if (teamWithUser?.userProfileId) {
        await PaymentHistoryService.recordItemPurchase(
          teamWithUser.userProfileId.toString(),
          teamId.toString(),
          "Mid-Season Cup Entry (Credits + Gems)",
          entryFees.credits.toString(),
          entryFees.gems
        );
      }
    }

    // Create tournament entry directly (payment already handled above)
    await prisma.tournamentEntry.create({
      data: {
        tournamentId,
        teamId,
        registeredAt: new Date()
      }
    });

    // Check if tournament is now full and start countdown if needed
    const entriesCount = await prisma.tournamentEntry.count({
      where: { tournamentId }
    });

    if (entriesCount >= 8) {
      // Tournament is full, start 10-minute countdown
      try {
        const { tournamentFlowService } = await import('./tournamentFlowService');
        tournamentFlowService.startTournamentCountdown(tournamentId);
        console.log(`Tournament ${tournamentId} is full - started 10-minute countdown`);
      } catch (error) {
        console.error(`Error starting tournament countdown for tournament ${tournamentId}:`, error);
      }
    }

    return tournamentId.toString();
  }

  // Fill tournament with AI teams
  async fillTournamentWithAI(tournamentId: number, spotsToFill: number): Promise<void> {
    const prisma = await DatabaseService.getInstance();
    const tournament = await prisma.tournament.findUnique({
      where: { id: Number(tournamentId) },
      include: {
        entries: {
          include: {
            team: true
          }
        }
      }
    });
    
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Get teams already in this tournament
    const participatingTeamIds = tournament.entries.map((entry: any) => entry.teamId);

    // Get available AI teams for this division (excluding already participating teams)
    const aiTeams = await prisma.team.findMany({
      where: {
        division: tournament.division,
        id: {
          notIn: participatingTeamIds
        }
      },
      take: spotsToFill
    });

    // Create tournament entries for AI teams
    const aiEntries = aiTeams.map((team: any) => ({
      tournamentId: Number(tournamentId),
      teamId: team.id,
      registeredAt: new Date()
    }));

    if (aiEntries.length > 0) {
      await prisma.tournamentEntry.createMany({
        data: aiEntries
      });

      // Check if tournament is now full and start countdown if needed
      const entriesCount = await prisma.tournamentEntry.count({
        where: { tournamentId: Number(tournamentId) }
      });

      if (entriesCount >= 8) {
        // Tournament is full, start 10-minute countdown
        try {
          const { tournamentFlowService } = await import('./tournamentFlowService');
          tournamentFlowService.startTournamentCountdown(Number(tournamentId));
          console.log(`Tournament ${tournamentId} is full (AI filled) - started 10-minute countdown`);
        } catch (error) {
          console.error(`Error starting tournament countdown for tournament ${tournamentId}:`, error);
        }
      }
    }
  }

  // Auto-start tournament management
  async checkAndStartTournaments(): Promise<void> {
    const prisma = await DatabaseService.getInstance();
    const now = new Date();

    // Find tournaments that are ready to start
    const readyTournaments = await prisma.tournament.findMany({
      where: {
        status: "REGISTRATION_OPEN",
        OR: [
          // Registration deadline has passed
          {
            registrationEndTime: {
              lte: now
            }
          }
        ]
      },
      include: {
        entries: {
          orderBy: {
            registeredAt: 'desc'
          }
        }
      }
    });

    for (const tournament of readyTournaments) {
      const currentParticipants = tournament.entries.length;
      const maxParticipants = tournament.type === 'MID_SEASON_CLASSIC' ? 16 : 8;

      // Check if tournament is full (8/8 participants)
      if (currentParticipants >= maxParticipants) {
        // Check if 10 minutes have passed since last registration
        const lastEntryTime = tournament.entries.length > 0 ? 
          Math.max(...tournament.entries.map((e: any) => new Date(e.registeredAt).getTime())) : 
          now.getTime();
        
        const timeSinceFullMs = now.getTime() - lastEntryTime;
        const twoMinutesMs = 2 * 60 * 1000; // 2 minutes
        
        if (timeSinceFullMs >= twoMinutesMs) {
          // Tournament is full and 2 minutes have passed - start it
          await this.startTournament(tournament.id);
          console.log(`Auto-started tournament ${tournament.id} (${tournament.name}) - 2 minutes elapsed since full`);
        }
        continue;
      }

      // Check if registration deadline has passed
      if (tournament.registrationEndTime && tournament.registrationEndTime <= now) {
        // Fill with AI teams and start
        const spotsToFill = maxParticipants - currentParticipants;
        if (spotsToFill > 0) {
          await this.fillTournamentWithAI(tournament.id, spotsToFill);
        }
        await this.startTournament(tournament.id);
        console.log(`Auto-started tournament ${tournament.id} (${tournament.name}) - registration deadline passed`);
      }
    }
  }

  // Start a tournament
  async startTournament(tournamentId: number): Promise<void> {
    const prisma = await DatabaseService.getInstance();
    const id = Number(tournamentId);
    await prisma.tournament.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        startTime: new Date()
      }
    });
    
    // Generate tournament matches
    try {
      await this.generateTournamentMatches(id);
      
      // Start tournament flow with live simulation
      try {
        const { tournamentFlowService } = await import('./tournamentFlowService');
        tournamentFlowService.startRoundWithBuffer(id, 1); // Start quarterfinals with buffer
        console.log(`Tournament ${tournamentId} matches generated - starting quarterfinals with 2-minute buffer`);
      } catch (error) {
        console.error(`Error starting tournament flow for tournament ${tournamentId}:`, error);
      }
    } catch (error) {
      console.error(`Error generating matches for tournament ${tournamentId}:`, error);
    }
  }
  
  // Generate tournament matches (8-team single elimination for Daily, 16-team for Mid-Season Cup)
  async generateTournamentMatches(tournamentId: number): Promise<void> {
    const prisma = await DatabaseService.getInstance();
    // Get tournament participants
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        entries: {
          include: {
            team: true
          }
        }
      }
    });

    if (!tournament) {
      throw new Error("Tournament not found");
    }

    const teams = tournament.entries.map((entry: any) => entry.team);
    const expectedTeams = tournament.type === 'MID_SEASON_CLASSIC' ? 16 : 8;
    
    if (teams.length !== expectedTeams) {
      throw new Error(`Tournament must have exactly ${expectedTeams} teams, found ${teams.length}`);
    }

    // Seed teams based on Global Rankings for competitive balance
    const seededTeams = await this.seedTeamsByGlobalRankings(teams);

    let round1Matches = [];
    let startingRound = 1;
    let matchType = "LEAGUE";

    if (tournament.type === 'MID_SEASON_CLASSIC') {
      // Mid-Season Cup: 16 teams -> Round of 16 (8 matches), round = 1
      startingRound = 1; // Round of 16
      matchType = "LEAGUE"; // Keep same match type
      
      for (let i = 0; i < 8; i++) {
        const homeTeam = seededTeams[i * 2];
        const awayTeam = seededTeams[i * 2 + 1];
        
        const match = await prisma.game.create({
          data: {
            tournamentId,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            gameDate: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
            matchType: 'PLAYOFF' as const,
            round: startingRound, // ROUND OF 16 = 1
            status: "SCHEDULED"
          }
        });
        
        round1Matches.push(match);
      }
      console.log(`Generated Mid-Season Cup bracket for tournament ${tournamentId} with ${teams.length} teams - Round of 16 created (${round1Matches.length} matches)`);
    } else {
      // Daily Division Tournament: 8 teams -> Quarterfinals (4 matches), round = 1  
      startingRound = 1; // Quarterfinals
      
      for (let i = 0; i < 4; i++) {
        const homeTeam = seededTeams[i * 2];
        const awayTeam = seededTeams[i * 2 + 1];
        
        const match = await prisma.game.create({
          data: {
            tournamentId,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            gameDate: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
            matchType: 'PLAYOFF' as const,
            round: startingRound, // QUARTERFINALS = 1
            status: "SCHEDULED"
          }
        });
        
        round1Matches.push(match);
      }
      console.log(`Generated Daily Division Tournament bracket for tournament ${tournamentId} with ${teams.length} teams - Quarterfinals created (${round1Matches.length} matches)`);
    }
  }

  // Seed teams based on Global Rankings for fair tournament brackets
  private async seedTeamsByGlobalRankings(teams: any[]): Promise<any[]> {
    try {
      // Calculate True Strength Rating for each team (same algorithm as Global Rankings)
      const teamsWithRankings = await Promise.all(teams.map(async (team) => {
        const divisionMultiplier = this.getDivisionMultiplier(team.division);
        
        // Enhanced calculations with safe fallbacks
        const strengthOfSchedule = this.calculateSimpleStrengthOfSchedule(team);
        const recentFormBias = this.calculateSimpleRecentForm(team);
        const healthFactor = this.calculateSimpleHealthFactor(team);
        const winPercentage = (team.wins || 0) / ((team.wins || 0) + (team.losses || 0) + (team.draws || 0) || 1);
        
        // Enhanced True Strength Rating Algorithm (same as Global Rankings)
        const baseRating = (team.teamPower || 0) * 10;           // Base: 40% weight (250 max)
        const divisionBonus = divisionMultiplier * 100;          // Division: 15% weight (200 max)
        const recordBonus = winPercentage * 120;                 // Record: 18% weight (120 max)
        const sosBonus = strengthOfSchedule * 1.5;               // SOS: 15% weight (~75 avg)
        const camaraderieBonus = (team.camaraderie || 0) * 2;    // Chemistry: 12% weight (200 max)
        const recentFormBonus = recentFormBias * 30;             // Recent Form: ±30 range
        const healthBonus = healthFactor * 50;                   // Health: 50 max
        
        const trueStrengthRating = Math.round(
          baseRating + divisionBonus + recordBonus + sosBonus + 
          camaraderieBonus + recentFormBonus + healthBonus
        );

        return {
          ...team,
          trueStrengthRating,
          tournamentSeed: 0 // Will be assigned after sorting
        };
      }));

      // Sort by True Strength Rating (descending - best teams first)
      teamsWithRankings.sort((a: any, b: any) => b.trueStrengthRating - a.trueStrengthRating);
      
      // Assign seeds (1 = highest ranked, 8/16 = lowest ranked)
      teamsWithRankings.forEach((team, index) => {
        team.tournamentSeed = index + 1;
      });

      console.log(`🏆 Tournament seeding completed:`);
      teamsWithRankings.forEach(team => {
        console.log(`  Seed #${team.tournamentSeed}: ${team.name} (Rating: ${team.trueStrengthRating}, Global Rank: ~${team.tournamentSeed})`);
      });

      return teamsWithRankings;
    } catch (error) {
      console.error('Error calculating tournament seeding, falling back to random:', error);
      // Fallback to random seeding if ranking calculation fails
      return [...teams].sort(() => Math.random() - 0.5);
    }
  }

  // Helper functions for seeding calculations (mirrored from worldRoutes.ts)
  private getDivisionMultiplier(division: number): number {
    switch (division) {
      case 1: return 2.0; // Diamond League (most competitive)
      case 2: return 1.8; // Platinum League
      case 3: return 1.6; // Gold League
      case 4: return 1.4; // Silver League
      case 5: return 1.2; // Bronze League
      case 6: return 1.1; // Iron League
      case 7: return 1.0; // Stone League
      case 8: return 0.9; // Copper League (least competitive)
      default: return 1.0;
    }
  }

  private calculateSimpleStrengthOfSchedule(team: any): number {
    // Simplified SOS calculation for tournament seeding
    const expectedPowerForDivision = this.getExpectedPowerForDivision(team.division);
    const actualPower = team.teamPower || expectedPowerForDivision;
    
    // Teams performing above division average likely faced stronger opponents
    return Math.max(10, Math.min(40, expectedPowerForDivision + (actualPower - expectedPowerForDivision) * 0.5));
  }

  private calculateSimpleRecentForm(team: any): number {
    // Simple calculation based on win percentage vs expected performance
    const totalGames = (team.wins || 0) + (team.losses || 0) + (team.draws || 0);
    if (totalGames === 0) return 0;
    
    const winPct = (team.wins || 0) / totalGames;
    const expectedWinPct = this.getDivisionExpectedWinRate(team.division);
    
    return Math.max(-1, Math.min(1, winPct - expectedWinPct));
  }

  private calculateSimpleHealthFactor(team: any): number {
    // Simplified health factor based on team power maintenance
    const expectedPower = this.getExpectedPowerForDivision(team.division);
    const actualPower = team.teamPower || expectedPower;
    
    // Factor assumes healthy teams maintain higher power levels
    return Math.max(0.5, Math.min(1.5, actualPower / expectedPower));
  }

  private getExpectedPowerForDivision(division: number): number {
    switch (division) {
      case 1: return 32; // Diamond League
      case 2: return 28; // Platinum
      case 3: return 26; // Gold
      case 4: return 24; // Silver
      case 5: return 22; // Bronze
      case 6: return 20; // Iron
      case 7: return 18; // Stone
      case 8: return 16; // Copper
      default: return 24; // Default
    }
  }

  private getDivisionExpectedWinRate(division: number): number {
    switch (division) {
      case 1: return 0.65; // Diamond teams expected to win more
      case 2: return 0.58; // Platinum
      case 3: return 0.52; // Gold  
      case 4: return 0.50; // Silver (neutral)
      case 5: return 0.48; // Bronze
      case 6: return 0.42; // Iron
      case 7: return 0.38; // Stone
      case 8: return 0.35; // Copper
      default: return 0.50; // Neutral
    }
  }

  // Method to advance tournament to next round (called when previous round completes)
  async advanceTournamentRound(tournamentId: number, completedRound: number): Promise<void> {
    const prisma = await DatabaseService.getInstance();
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Get winners from completed round
    const completedMatches = await prisma.game.findMany({
      where: {
        tournamentId: tournamentId,
        round: completedRound,
        status: "COMPLETED"
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    const winners = completedMatches.map((match: any) => {
      return (match.homeScore || 0) > (match.awayScore || 0) ? match.homeTeam : match.awayTeam;
    });

    // Create next round matches based on completed round
    if (completedRound === 1 && winners.length === 4) { // QUARTERFINALS = 1
      // Create semifinals
      for (let i = 0; i < 2; i++) {
        await prisma.game.create({
          data: {
            tournamentId,
            homeTeamId: winners[i * 2].id,
            awayTeamId: winners[i * 2 + 1].id,
            gameDate: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
            matchType: "LEAGUE",
            round: 2, // SEMIFINALS = 2
            status: "SCHEDULED"
          }
        });
      }
    } else if (completedRound === 2 && winners.length === 2) { // SEMIFINALS = 2
      // Create finals
      await prisma.game.create({
        data: {
          tournamentId,
          homeTeamId: winners[0].id,
          awayTeamId: winners[1].id,
          gameDate: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
          matchType: "LEAGUE",
          round: 3, // FINALS = 3
          status: "SCHEDULED"
        }
      });
    }
  }
}

export const tournamentService = new TournamentService();