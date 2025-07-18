import { prisma } from "../db";
import { randomUUID } from "crypto";
import moment from "moment-timezone";
import { PaymentHistoryService } from "./paymentHistoryService";

export interface TournamentReward {
  credits: number;
  gems: number;
  trophy?: string;
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
      2: { // Platinum
        champion: { credits: 16000, gems: 8 },
        runnerUp: { credits: 6000, gems: 0 }
      },
      3: { // Gold
        champion: { credits: 12000, gems: 5 },
        runnerUp: { credits: 4500, gems: 0 }
      },
      4: { // Silver
        champion: { credits: 9000, gems: 3 },
        runnerUp: { credits: 3000, gems: 0 }
      },
      5: { // Bronze
        champion: { credits: 6000, gems: 0 },
        runnerUp: { credits: 2000, gems: 0 }
      },
      6: { // Copper
        champion: { credits: 4000, gems: 0 },
        runnerUp: { credits: 1500, gems: 0 }
      },
      7: { // Iron
        champion: { credits: 2500, gems: 0 },
        runnerUp: { credits: 1000, gems: 0 }
      },
      8: { // Stone
        champion: { credits: 1500, gems: 0 },
        runnerUp: { credits: 500, gems: 0 }
      }
    };
    return rewardTable[division] || rewardTable[8];
  }

  // Mid-Season Cup reward structure (all divisions)
  private getMidSeasonCupRewards(division: number): TournamentConfig["rewards"] {
    const divisionNames = ["", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Iron", "Stone", "Copper"];
    const trophyName = `${divisionNames[division]} Mid-Season Cup Trophy`;
    
    const rewardTable: Record<number, TournamentConfig["rewards"]> = {
      1: { // Diamond
        champion: { credits: 200000, gems: 75, trophy: trophyName },
        runnerUp: { credits: 80000, gems: 30 },
        semifinalist: { credits: 30000, gems: 0 }
      },
      2: { // Platinum
        champion: { credits: 150000, gems: 60, trophy: trophyName },
        runnerUp: { credits: 60000, gems: 25 },
        semifinalist: { credits: 25000, gems: 0 }
      },
      3: { // Gold
        champion: { credits: 100000, gems: 40, trophy: trophyName },
        runnerUp: { credits: 40000, gems: 15 },
        semifinalist: { credits: 15000, gems: 0 }
      },
      4: { // Silver
        champion: { credits: 75000, gems: 30, trophy: trophyName },
        runnerUp: { credits: 30000, gems: 10 },
        semifinalist: { credits: 10000, gems: 0 }
      },
      5: { // Bronze
        champion: { credits: 50000, gems: 20, trophy: trophyName },
        runnerUp: { credits: 20000, gems: 5 },
        semifinalist: { credits: 7500, gems: 0 }
      },
      6: { // Copper
        champion: { credits: 30000, gems: 15, trophy: trophyName },
        runnerUp: { credits: 12000, gems: 0 },
        semifinalist: { credits: 5000, gems: 0 }
      },
      7: { // Iron
        champion: { credits: 20000, gems: 10, trophy: trophyName },
        runnerUp: { credits: 8000, gems: 0 },
        semifinalist: { credits: 2500, gems: 0 }
      },
      8: { // Stone
        champion: { credits: 15000, gems: 5, trophy: trophyName },
        runnerUp: { credits: 6000, gems: 0 },
        semifinalist: { credits: 2000, gems: 0 }
      }
    };
    return rewardTable[division] || rewardTable[8];
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
    if (division === 1) {
      throw new Error("Division 1 (Diamond) does not have Daily Division Tournaments");
    }

    const season = this.getCurrentSeason();
    const gameDay = this.getCurrentGameDay();
    const rewards = this.getDailyDivisionTournamentRewards(division);
    
    const divisionNames = ["", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Iron", "Stone", "Copper"];
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
      prizePoolJson: rewards,
      registrationEndTime: moment.tz("America/New_York").add(60, 'minutes').toDate(), // 60 minutes after creation
      startTime: moment.tz("America/New_York").add(60, 'minutes').toDate(),
    };

    const created = await prisma.tournament.create({
      data: tournament
    });
    return created.id;
  }

  // Create Mid-Season Cup tournament
  async createMidSeasonCup(division: number): Promise<string> {
    const season = this.getCurrentSeason();
    const gameDay = 7; // Always Day 7
    const rewards = this.getMidSeasonCupRewards(division);
    
    const divisionNames = ["", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Iron", "Stone", "Copper"];
    const tournamentName = `${divisionNames[division]} Mid-Season Cup - Season ${season}`;
    
    // Generate tournament ID for Mid-Season Cup (Season-Division-UniqueIdentifier format)
    const tournamentId = await this.generateMidSeasonCupId(season, division);

    const tournament = {
      name: tournamentName,
      tournamentId: tournamentId,
      type: "MID_SEASON_CLASSIC" as const, // Use MID_SEASON_CLASSIC to match the existing logic
      division,
      seasonDay: 7,
      entryFeeCredits: BigInt(10000),
      entryFeeGems: 20,
      status: "REGISTRATION_OPEN" as const,
      prizePoolJson: rewards,
      registrationEndTime: moment.tz("America/New_York").endOf('day').toDate(), // End of Day 6
      startTime: moment.tz("America/New_York").add(1, 'day').hour(13).minute(0).toDate() // 1 PM EST Day 7
    };

    const created = await prisma.tournament.create({
      data: tournament
    });
    return created.id;
  }

  // Fill Mid-Season Cup with AI teams if needed at 1PM on Day 7
  async fillMidSeasonCupWithAI(tournamentId: string): Promise<void> {
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
    const existingTeamIds = tournament.entries.map(entry => entry.teamId);

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
      await this.createAITeamsForMidSeasonCup(tournament.division, teamsToCreate);

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
      const aiEntries = newAiTeams.map(team => ({
        tournamentId: parseInt(tournamentId),
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
      const aiEntries = aiTeams.map(team => ({
        tournamentId: parseInt(tournamentId),
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
            lastName: "Coach",
            displayName: `AI Coach ${i + 1}`,
            isAI: true
          }
        });

        // Create AI team
        const aiTeam = await prisma.team.create({
          data: {
            name: teamName,
            userProfileId: aiUser.id,
            division: division,
            subdivision: "main",
            isAI: true,
            wins: Math.floor(Math.random() * 3),
            losses: Math.floor(Math.random() * 3),
            draws: Math.floor(Math.random() * 2),
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
            lightingLevel: 1,
            screensLevel: 1,
            fanLoyalty: 50 + Math.floor(Math.random() * 30)
          }
        });

        // Generate 12 players for AI team
        for (let j = 0; j < 12; j++) {
          const race = races[Math.floor(Math.random() * races.length)];
          const position = positions[j];
          const firstName = this.generateRandomName(race.toLowerCase()).firstName;
          const lastName = this.generateRandomName(race.toLowerCase()).lastName;

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
              stamina: 20 + Math.floor(Math.random() * 15),
              leadership: 20 + Math.floor(Math.random() * 15),
              agility: 20 + Math.floor(Math.random() * 15),
              potential: 1 + Math.floor(Math.random() * 4),
              injuryStatus: "HEALTHY",
              dailyStaminaLevel: 100,
              maxStamina: 100,
              camaraderie: 50 + Math.floor(Math.random() * 40)
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

    const raceNames = names[race as keyof typeof names] || names.human;
    const firstName = raceNames.first[Math.floor(Math.random() * raceNames.first.length)];
    const lastName = raceNames.last[Math.floor(Math.random() * raceNames.last.length)];

    return { firstName, lastName };
  }

  // Ensure tournaments exist for current day and division
  async ensureTournamentsExist(division: number): Promise<void> {
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
  async getAvailableTournaments(teamId: string) {
    const team = await prisma.team.findFirst({
      where: { id: teamId }
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
      where: { teamId: teamId },
      select: { tournamentId: true }
    });

    const registeredTournamentIds = new Set(existingEntries.map(e => e.tournamentId));

    return availableTournaments.filter(t => !registeredTournamentIds.has(t.id));
  }

  // Register team for tournament
  async registerForTournament(teamId: string, tournamentId: string, paymentType?: "credits" | "gems" | "both"): Promise<void> {
    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId }
    });
    if (!tournament) throw new Error("Tournament not found");

    const team = await prisma.team.findFirst({
      where: { id: teamId },
      include: { finances: true }
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
    if (tournament.entryFeeItemId) {
      // Daily Division Tournament - requires Tournament Entry item
      const entryItems = await prisma.teamInventory.findMany({
        where: {
          teamId: teamId,
          itemId: tournament.entryFeeItemId,
          quantity: { gte: 1 }
        }
      });

      if (entryItems.length === 0) {
        throw new Error("No Tournament Entry items available");
      }

      // Consume entry item
      const entryItem = entryItems[0];
      if ((entryItem.quantity || 0) > 1) {
        await prisma.teamInventory.update({
          where: { id: entryItem.id },
          data: { quantity: (entryItem.quantity || 0) - 1 }
        });
      } else {
        await prisma.teamInventory.delete({
          where: { id: entryItem.id }
        });
      }

      // Log Daily Division Tournament entry item consumption
      const teamWithUser = await prisma.team.findUnique({
        where: { id: teamId },
        include: { user: true }
      });
      if (teamWithUser?.user) {
        await PaymentHistoryService.recordItemPurchase(
          teamWithUser.user.id,
          teamId,
          "Daily Division Tournament Entry",
          0,
          0
        );
      }
    } else {
      // Mid-Season Cup - requires credits, gems, or both
      const entryFeeCredits = tournament.entryFeeCredits || 0;
      const entryFeeGems = tournament.entryFeeGems || 0;
      const teamCredits = Number(team.finances?.credits || 0);
      const teamGems = team.finances?.gems || 0;
      
      if (paymentType === "both") {
        // Require BOTH credits and gems
        if (teamCredits < entryFeeCredits || teamGems < entryFeeGems) {
          throw new Error("Insufficient credits AND gems for entry fee");
        }
        // Charge both
        await prisma.teamFinances.update({
          where: { teamId: parseInt(teamId) },
          data: { 
            credits: teamCredits - entryFeeCredits,
            gems: teamGems - entryFeeGems 
          }
        });
      } else if (paymentType === "credits" && teamCredits >= entryFeeCredits) {
        // Pay with credits only
        await prisma.teamFinances.update({
          where: { teamId: parseInt(teamId) },
          data: { credits: teamCredits - entryFeeCredits }
        });
      } else if (paymentType === "gems" && teamGems >= entryFeeGems) {
        // Pay with gems only
        await prisma.teamFinances.update({
          where: { teamId: parseInt(teamId) },
          data: { gems: teamGems - entryFeeGems }
        });
      } else {
        // Legacy: try credits first, then gems (backwards compatibility)
        if (teamCredits >= entryFeeCredits) {
          await prisma.teamFinances.update({
            where: { teamId: parseInt(teamId) },
            data: { credits: teamCredits - entryFeeCredits }
          });
        } else if (teamGems >= entryFeeGems) {
          await prisma.teamFinances.update({
            where: { teamId: parseInt(teamId) },
            data: { gems: teamGems - entryFeeGems }
          });
        } else {
          throw new Error("Insufficient credits or gems for entry fee");
        }
      }
    }

    // Check if team is already registered
    const existingEntry = await prisma.tournamentEntry.findFirst({
      where: {
        tournamentId,
        teamId
      }
    });

    if (existingEntry) {
      throw new Error("You are already registered for this tournament");
    }

    // Create tournament entry
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
  async getTeamTournaments(teamId: string) {
    const entries = await prisma.tournamentEntry.findMany({
      where: { teamId },
      include: { tournament: true },
      orderBy: { registeredAt: 'desc' }
    });

    return entries;
  }

  // Get tournament history for a team
  async getTournamentHistory(teamId: string) {
    const completedTournaments = await prisma.tournamentEntry.findMany({
      where: {
        teamId,
        tournament: { status: "COMPLETED" }
      },
      include: { tournament: true },
      orderBy: { tournament: { startTime: 'desc' } }
    });

    return completedTournaments.map(({ tournament, ...entry }) => ({
      id: tournament.id,
      name: tournament.name,
      type: tournament.type,
      division: tournament.division,
      season: tournament.season,
      placement: entry.placement,
      creditsWon: entry.creditsWon || 0,
      gemsWon: entry.gemsWon || 0,
      trophyWon: entry.trophyWon,
      completedAt: tournament.completedAt
    }));
  }

  // Get tournament statistics for a team
  async getTournamentStats(teamId: string) {
    const entries = await prisma.tournamentEntry.findMany({
      where: { teamId: teamId }
    });

    const totalTournaments = entries.length;
    const wins = entries.filter(e => e.placement === 1).length;
    const runnerUps = entries.filter(e => e.placement === 2).length;
    const totalCreditsWon = entries.reduce((sum, e) => sum + (e.creditsWon || 0), 0);
    const totalGemsWon = entries.reduce((sum, e) => sum + (e.gemsWon || 0), 0);
    const trophiesWon = entries.filter(e => e.trophyWon).length;

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

  async createOrJoinDailyTournament(teamId: string, division: number): Promise<string> {
    const gameDay = this.getCurrentGameDay();
    const season = this.getCurrentSeason();

    // ✅ FIX: Only check for active Daily tournaments, not Mid-Season Cups
    const existingActiveEntry = await prisma.tournamentEntry.findFirst({
      where: {
        teamId,
        tournament: {
          type: "DAILY_DIVISIONAL", // Only check Daily tournaments
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

    if (existingActiveEntry) {
      throw new Error(`You are already registered for ${existingActiveEntry.tournament.name} (Daily Division Tournament). Please wait for your current Daily tournament to complete before registering for another.`);
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

    let tournamentId: string;

    if (existingTournament.length > 0) {
      // Tournament exists, join it
      tournamentId = existingTournament[0].id;
    } else {
      // Create new tournament
      tournamentId = await this.createDailyDivisionTournament(division);
    }

    // Register the team (this will check for entry items and handle payments)
    await this.registerForTournament(teamId, tournamentId);

    return tournamentId;
  }

  async createOrJoinMidSeasonCup(teamId: string, division: number, paymentType: "credits" | "gems" | "both"): Promise<string> {
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

    let tournamentId: string;

    if (existingTournament.length > 0) {
      // Tournament exists, join it
      tournamentId = existingTournament[0].id;
    } else {
      // Create new tournament - use createMidSeasonCup for proper implementation
      tournamentId = await this.createMidSeasonCup(division);
    }

    // Handle payment based on user choice
    const team = await prisma.team.findFirst({
      where: { id: teamId },
      include: { finances: true }
    });
    if (!team) {
      throw new Error("Team not found");
    }

    const teamCredits = Number(team.finances?.credits || 0);
    const teamGems = team.finances?.gems || 0;

    if (paymentType === "credits") {
      if (teamCredits < 10000) {
        throw new Error("Insufficient credits for Mid-Season Cup entry (10,000₡ required)");
      }
      await prisma.teamFinances.update({
        where: { teamId: parseInt(teamId) },
        data: { credits: teamCredits - 10000 }
      });

      // Log Mid-Season Cup entry fee transaction
      const teamWithUser = await prisma.team.findUnique({
        where: { id: teamId },
        include: { user: true }
      });
      if (teamWithUser?.user) {
        await PaymentHistoryService.recordItemPurchase(
          teamWithUser.user.id,
          teamId,
          "Mid-Season Cup Entry (Credits)",
          "TOURNAMENT_ENTRY",
          10000,
          0
        );
      }
    } else if (paymentType === "gems") {
      if (teamGems < 20) {
        throw new Error("Insufficient gems for Mid-Season Cup entry (20💎 required)");
      }
      await prisma.teamFinances.update({
        where: { teamId: parseInt(teamId) },
        data: { gems: teamGems - 20 }
      });

      // Log Mid-Season Cup entry fee transaction
      const teamWithUser = await prisma.team.findUnique({
        where: { id: teamId },
        include: { user: true }
      });
      if (teamWithUser?.user) {
        await PaymentHistoryService.recordItemPurchase(
          teamWithUser.user.id,
          teamId,
          "Mid-Season Cup Entry (Gems)",
          "TOURNAMENT_ENTRY",
          0,
          20
        );
      }
    } else if (paymentType === "both") {
      if (teamCredits < 10000 || teamGems < 20) {
        throw new Error("Insufficient credits AND gems for Mid-Season Cup entry (10,000₡ AND 20💎 required)");
      }
      await prisma.teamFinances.update({
        where: { teamId: parseInt(teamId) },
        data: { 
          credits: teamCredits - 10000,
          gems: teamGems - 20
        }
      });

      // Log Mid-Season Cup entry fee transaction
      const teamWithUser = await prisma.team.findUnique({
        where: { id: teamId },
        include: { user: true }
      });
      if (teamWithUser?.user) {
        await PaymentHistoryService.recordItemPurchase(
          teamWithUser.user.id,
          teamId,
          "Mid-Season Cup Entry (Credits + Gems)",
          "TOURNAMENT_ENTRY",
          10000,
          20
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

    return tournamentId;
  }

  // Fill tournament with AI teams
  async fillTournamentWithAI(tournamentId: string, spotsToFill: number): Promise<void> {
    const tournament = await prisma.tournament.findUnique({
      where: { id: parseInt(tournamentId) },
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
    const participatingTeamIds = tournament.entries.map(entry => entry.teamId);

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
    const aiEntries = aiTeams.map(team => ({
      tournamentId: parseInt(tournamentId),
      teamId: team.id,
      registeredAt: new Date()
    }));

    if (aiEntries.length > 0) {
      await prisma.tournamentEntry.createMany({
        data: aiEntries
      });

      // Check if tournament is now full and start countdown if needed
      const entriesCount = await prisma.tournamentEntry.count({
        where: { tournamentId: parseInt(tournamentId) }
      });

      if (entriesCount >= 8) {
        // Tournament is full, start 10-minute countdown
        try {
          const { tournamentFlowService } = await import('./tournamentFlowService');
          tournamentFlowService.startTournamentCountdown(parseInt(tournamentId));
          console.log(`Tournament ${tournamentId} is full (AI filled) - started 10-minute countdown`);
        } catch (error) {
          console.error(`Error starting tournament countdown for tournament ${tournamentId}:`, error);
        }
      }
    }
  }

  // Auto-start tournament management
  async checkAndStartTournaments(): Promise<void> {
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
      const maxParticipants = tournament.maxTeams || 8;

      // Check if tournament is full (8/8 participants)
      if (currentParticipants >= maxParticipants) {
        // Check if 10 minutes have passed since last registration
        const lastEntryTime = tournament.entries.length > 0 ? 
          Math.max(...tournament.entries.map(e => new Date(e.registeredAt).getTime())) : 
          now.getTime();
        
        const timeSinceFullMs = now.getTime() - lastEntryTime;
        const tenMinutesMs = 10 * 60 * 1000; // 10 minutes
        
        if (timeSinceFullMs >= tenMinutesMs) {
          // Tournament is full and 10 minutes have passed - start it
          await this.startTournament(tournament.id.toString());
          console.log(`Auto-started tournament ${tournament.id} (${tournament.name}) - 10 minutes elapsed since full`);
        }
        continue;
      }

      // Check if registration deadline has passed
      if (tournament.registrationEndTime && tournament.registrationEndTime <= now) {
        // Fill with AI teams and start
        const spotsToFill = maxParticipants - currentParticipants;
        if (spotsToFill > 0) {
          await this.fillTournamentWithAI(tournament.id.toString(), spotsToFill);
        }
        await this.startTournament(tournament.id.toString());
        console.log(`Auto-started tournament ${tournament.id} (${tournament.name}) - registration deadline passed`);
      }
    }
  }

  // Start a tournament
  async startTournament(tournamentId: string): Promise<void> {
    const id = parseInt(tournamentId);
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
  
  // Generate tournament matches (8-team single elimination)
  async generateTournamentMatches(tournamentId: number): Promise<void> {
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

    const teams = tournament.entries.map(entry => entry.team);
    
    if (teams.length !== 8) {
      throw new Error(`Tournament must have exactly 8 teams, found ${teams.length}`);
    }

    // Shuffle teams randomly for fair bracket
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);

    // ONLY Create Round 1 matches (Quarterfinals) - fix for pre-determined teams issue
    const round1Matches = [];
    for (let i = 0; i < 4; i++) {
      const homeTeam = shuffledTeams[i * 2];
      const awayTeam = shuffledTeams[i * 2 + 1];
      
      const match = await prisma.game.create({
        data: {
          tournamentId,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          gameDate: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
          matchType: "TOURNAMENT_DAILY",
          round: 1, // QUARTERFINALS = 1
          status: "SCHEDULED"
        }
      });
      
      round1Matches.push(match);
    }

    console.log(`Generated tournament bracket for tournament ${tournamentId} with ${teams.length} teams - ONLY quarterfinals created`);
  }

  // Method to advance tournament to next round (called when previous round completes)
  async advanceTournamentRound(tournamentId: number, completedRound: number): Promise<void> {
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

    const winners = completedMatches.map(match => {
      return match.homeTeamScore > match.awayTeamScore ? match.homeTeam : match.awayTeam;
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
            matchType: "TOURNAMENT_DAILY",
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
          matchType: "TOURNAMENT_DAILY",
          round: 3, // FINALS = 3
          status: "SCHEDULED"
        }
      });
    }
  }
}

export const tournamentService = new TournamentService();