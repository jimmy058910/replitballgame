import { prisma } from "../db";
import { randomUUID } from "crypto";
import moment from "moment-timezone";

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
  
  // Daily Divisional Cup reward structure (divisions 2-8)
  private getDailyCupRewards(division: number): TournamentConfig["rewards"] {
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

  // Mid-Season Classic reward structure (all divisions)
  private getMidSeasonRewards(division: number): TournamentConfig["rewards"] {
    const divisionNames = ["", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Copper", "Iron", "Stone"];
    const trophyName = `${divisionNames[division]} Mid-Season Classic Trophy`;
    
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
    const startDate = new Date("2025-01-01");
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.floor(daysSinceStart / 17);
  }

  // Get current game day (1-17 within season)
  private getCurrentGameDay(): number {
    const startDate = new Date("2025-01-01");
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

  // Create Daily Divisional Cup tournament
  async createDailyCupTournament(division: number): Promise<string> {
    if (division === 1) {
      throw new Error("Division 1 (Diamond) does not have Daily Divisional Cups");
    }

    const season = this.getCurrentSeason();
    const gameDay = this.getCurrentGameDay();
    const rewards = this.getDailyCupRewards(division);
    
    const divisionNames = ["", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Copper", "Iron", "Stone"];
    const tournamentName = `${divisionNames[division]} Daily Cup`;
    
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
      registrationEndTime: moment.tz("America/New_York").add(20, 'hours').toDate(), // 8 PM EST
      startTime: moment.tz("America/New_York").add(20, 'hours').toDate(),
    };

    const created = await prisma.tournament.create({
      data: tournament
    });
    return created.id;
  }

  // Create Mid-Season Classic tournament
  async createMidSeasonClassic(division: number): Promise<string> {
    const season = this.getCurrentSeason();
    const gameDay = 7; // Always Day 7
    const rewards = this.getMidSeasonRewards(division);
    
    const divisionNames = ["", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Copper", "Iron", "Stone"];
    const tournamentName = `${divisionNames[division]} Mid-Season Classic - Season ${season}`;
    
    // Generate tournament ID for Mid-Season Classic too
    const tournamentId = await this.generateTournamentId(season, division, gameDay);

    const tournament = {
      name: tournamentName,
      tournamentId: tournamentId,
      type: "MID_SEASON_CLASSIC" as const,
      division,
      seasonDay: 7,
      entryFeeCredits: BigInt(10000),
      entryFeeGems: 20,
      status: "REGISTRATION_OPEN" as const,
      prizePoolJson: rewards,
      registrationEndTime: moment.tz("America/New_York").endOf('day').toDate(), // End of Day 6
      startTime: moment.tz("America/New_York").add(1, 'day').hour(13).minute(0).toDate(), // 1 PM EST Day 7
    };

    const created = await prisma.tournament.create({
      data: tournament
    });
    return created.id;
  }

  // Ensure tournaments exist for current day and division
  async ensureTournamentsExist(division: number): Promise<void> {
    const season = this.getCurrentSeason();
    const gameDay = this.getCurrentGameDay();

    // Check if Daily Divisional Cup exists for this division and day
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
          await this.createDailyCupTournament(division);
          console.log(`Created Daily Divisional Cup for Division ${division}, Day ${gameDay}`);
        } catch (error) {
          console.error(`Failed to create Daily Divisional Cup for Division ${division}:`, error);
        }
      }
    }

    // Check if Mid-Season Classic exists for this division (only create on Day 1-6)
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
          await this.createMidSeasonClassic(division);
          console.log(`Created Mid-Season Classic for Division ${division}, Season ${season}`);
        } catch (error) {
          console.error(`Failed to create Mid-Season Classic for Division ${division}:`, error);
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
      // Daily Divisional Cup - requires Tournament Entry item
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
    } else {
      // Mid-Season Classic - requires credits, gems, or both
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

    // Check if team is already registered for ANY active tournament
    const existingActiveEntry = await prisma.tournamentEntry.findFirst({
      where: {
        teamId,
        tournament: {
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
      const tournamentType = existingActiveEntry.tournament.type === "DAILY_DIVISIONAL" ? "Daily Cup" : "Mid-Season Classic";
      throw new Error(`You are already registered for ${existingActiveEntry.tournament.name} (${tournamentType}). Please wait for your current tournament to complete before registering for another.`);
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
      tournamentId = await this.createDailyCupTournament(division);
    }

    // Register the team (this will check for entry items and handle payments)
    await this.registerForTournament(teamId, tournamentId);

    return tournamentId;
  }

  async createOrJoinMidSeasonClassic(teamId: string, division: number, paymentType: "credits" | "gems" | "both"): Promise<string> {
    const season = this.getCurrentSeason();

    // Check if team is already registered for ANY active tournament
    const existingActiveEntry = await prisma.tournamentEntry.findFirst({
      where: {
        teamId,
        tournament: {
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
      const tournamentType = existingActiveEntry.tournament.type === "DAILY_DIVISIONAL" ? "Daily Cup" : "Mid-Season Classic";
      throw new Error(`You are already registered for ${existingActiveEntry.tournament.name} (${tournamentType}). Please wait for your current tournament to complete before registering for another.`);
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
      // Create new tournament
      tournamentId = await this.createMidSeasonClassic(division);
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
        throw new Error("Insufficient credits for Mid-Season Classic entry (10,000₡ required)");
      }
      await prisma.teamFinances.update({
        where: { teamId: parseInt(teamId) },
        data: { credits: teamCredits - 10000 }
      });
    } else if (paymentType === "gems") {
      if (teamGems < 20) {
        throw new Error("Insufficient gems for Mid-Season Classic entry (20💎 required)");
      }
      await prisma.teamFinances.update({
        where: { teamId: parseInt(teamId) },
        data: { gems: teamGems - 20 }
      });
    } else if (paymentType === "both") {
      if (teamCredits < 10000 || teamGems < 20) {
        throw new Error("Insufficient credits AND gems for Mid-Season Classic entry (10,000₡ AND 20💎 required)");
      }
      await prisma.teamFinances.update({
        where: { teamId: parseInt(teamId) },
        data: { 
          credits: teamCredits - 10000,
          gems: teamGems - 20
        }
      });
    }

    // Create tournament entry directly (payment already handled above)
    await prisma.tournamentEntry.create({
      data: {
        tournamentId,
        teamId,
        registeredAt: new Date()
      }
    });

    return tournamentId;
  }

  // Fill tournament with AI teams
  async fillTournamentWithAI(tournamentId: string, spotsToFill: number): Promise<void> {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });
    
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Get available AI teams for this division
    const aiTeams = await prisma.team.findMany({
      where: {
        division: tournament.division,
        isAI: true,
        userProfileId: null
      },
      take: spotsToFill
    });

    // Create tournament entries for AI teams
    const aiEntries = aiTeams.map(team => ({
      tournamentId: tournamentId,
      teamId: team.id,
      entryTime: new Date(),
      placement: null,
      creditsWon: BigInt(0),
      gemsWon: 0,
      trophyWon: null
    }));

    if (aiEntries.length > 0) {
      await prisma.tournamentEntry.createMany({
        data: aiEntries
      });
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
        entries: true
      }
    });

    for (const tournament of readyTournaments) {
      const currentParticipants = tournament.entries.length;
      const maxParticipants = tournament.maxTeams || 8;

      // Check if tournament is full
      if (currentParticipants >= maxParticipants) {
        await this.startTournament(tournament.id);
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
      }
    }
  }

  // Start a tournament
  async startTournament(tournamentId: string): Promise<void> {
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: "IN_PROGRESS",
        tournamentStartTime: new Date()
      }
    });
  }
}

export const tournamentService = new TournamentService();