import { prisma } from '../db.js';
import { storage } from '../storage.js';
import { logInfo } from './errorService.js';
import { Race, PlayerRole } from '../../generated/prisma.js';

/**
 * Late Signup Service
 * 
 * Handles team registration between Day 1 3PM and Day 9 3PM
 * - Places teams in Division 8 shortened seasons
 * - Generates shortened schedules when 8 teams are reached
 * - Ensures teams can still participate in tournaments
 */
export class LateSignupService {
  
  /**
   * Check if we're currently in the late signup window
   */
  static async isLateSignupWindow(): Promise<boolean> {
    const currentSeason = await storage.seasons.getCurrentSeason();
    if (!currentSeason) return false;
    
    const { currentDayInCycle } = this.getCurrentSeasonInfo(currentSeason);
    const now = new Date();
    const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    
    // Late signup window: Day 1 3PM to Day 9 3PM
    if (currentDayInCycle === 1 && estTime.getHours() >= 15) {
      return true; // From Day 1 3PM onwards
    }
    
    if (currentDayInCycle >= 2 && currentDayInCycle <= 8) {
      return true; // Full Days 2-8
    }
    
    if (currentDayInCycle === 9 && estTime.getHours() < 15) {
      return true; // Until Day 9 3PM
    }
    
    return false;
  }
  
  /**
   * Get current season information
   */
  private static getCurrentSeasonInfo(currentSeason: any): {
    currentDayInCycle: number;
    seasonNumber: number;
  } {
    const seasonStartDate = currentSeason.startDateOriginal || currentSeason.startDate || new Date();
    const daysSinceStart = Math.floor((new Date().getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentDayInCycle = (daysSinceStart % 17) + 1;
    const seasonNumber = Math.floor(daysSinceStart / 17);
    
    return { currentDayInCycle, seasonNumber };
  }
  
  /**
   * Find or create a late signup subdivision in Division 8
   */
  static async findOrCreateLateSignupSubdivision(): Promise<string> {
    // Find existing late signup subdivisions with less than 8 teams
    const lateSignupSubdivisions = ["late_alpha", "late_beta", "late_gamma", "late_delta"];
    
    for (const subdivisionName of lateSignupSubdivisions) {
      const teamsInSubdivision = await storage.teams.getTeamsByDivisionAndSubdivision(8, subdivisionName);
      
      if (teamsInSubdivision.length < 8) {
        return subdivisionName;
      }
    }
    
    // If all late signup subdivisions are full, create a new one
    const newSubdivisionName = `late_${Date.now().toString().slice(-6)}`;
    return newSubdivisionName;
  }

  /**
   * Process daily late signups (Days 1-8) - Create subdivisions and generate schedules
   * Called daily at 3PM EDT from Days 1-8
   */
  static async processDailyLateSignups(currentDay: number): Promise<void> {
    logInfo(`Starting daily late signup processing for Day ${currentDay}...`);
    
    try {
      // Get all existing late signup subdivisions
      const existingSubdivisions = await this.getExistingLateSignupSubdivisions();
      
      // Check each subdivision and fill with AI if it has teams but isn't full
      for (const subdivision of existingSubdivisions) {
        const teams = await storage.teams.getTeamsByDivisionAndSubdivision(8, subdivision.subdivision);
        
        if (teams.length > 0 && teams.length < 8) {
          // Subdivision has teams but isn't full - fill with AI teams
          const aiTeamsNeeded = 8 - teams.length;
          logInfo(`Filling ${subdivision.subdivision} with ${aiTeamsNeeded} AI teams`);
          
          await this.generateAITeamsForSubdivision(subdivision.subdivision, aiTeamsNeeded);
          
          // Generate shortened schedule immediately when subdivision becomes full
          const allTeams = await storage.teams.getTeamsByDivisionAndSubdivision(8, subdivision.subdivision);
          await this.generateShortenedSeasonSchedule(subdivision.subdivision, allTeams);
          
          logInfo(`Subdivision ${subdivision.subdivision} filled and schedule generated for Days ${currentDay}-14`);
        }
      }
      
      logInfo(`Daily late signup processing completed for Day ${currentDay}`);
    } catch (error) {
      console.error('Error in daily late signup processing:', error);
    }
  }
  
  /**
   * Get all existing late signup subdivisions
   */
  private static async getExistingLateSignupSubdivisions(): Promise<Array<{ subdivision: string; teamCount: number }>> {
    const subdivisions = await prisma.team.findMany({
      where: {
        division: 8,
        subdivision: {
          startsWith: 'late_'
        }
      },
      select: {
        subdivision: true
      },
      distinct: ['subdivision']
    });
    
    const result = [];
    for (const { subdivision } of subdivisions) {
      if (subdivision) {
        const teams = await storage.teams.getTeamsByDivisionAndSubdivision(8, subdivision);
        result.push({
          subdivision,
          teamCount: teams.length
        });
      }
    }
    
    return result;
  }

  /**
   * Fill late signup subdivisions with AI teams if they don't reach 8 teams by Day 9
   */
  static async fillLateSignupSubdivisionsWithAI(): Promise<void> {
    const currentSeason = await storage.seasons.getCurrentSeason();
    if (!currentSeason) return;
    
    const { currentDayInCycle } = this.getCurrentSeasonInfo(currentSeason);
    const now = new Date();
    const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    
    // Only fill on Day 9 at 3PM or later
    if (currentDayInCycle !== 9 || estTime.getHours() < 15) {
      return;
    }
    
    logInfo('Starting AI team filling for late signup subdivisions...');
    
    const lateSignupSubdivisions = ["late_alpha", "late_beta", "late_gamma", "late_delta"];
    
    for (const subdivisionName of lateSignupSubdivisions) {
      const teamsInSubdivision = await storage.teams.getTeamsByDivisionAndSubdivision(8, subdivisionName);
      
      if (teamsInSubdivision.length > 0 && teamsInSubdivision.length < 8) {
        const teamsToAdd = 8 - teamsInSubdivision.length;
        
        logInfo(`Filling ${subdivisionName} with ${teamsToAdd} AI teams (currently has ${teamsInSubdivision.length} teams)`);
        
        // Generate AI teams for this subdivision
        await this.generateAITeamsForSubdivision(subdivisionName, teamsToAdd);
        
        // Generate shortened season schedule for this subdivision
        const allTeams = await storage.teams.getTeamsByDivisionAndSubdivision(8, subdivisionName);
        await this.generateShortenedSeasonSchedule(subdivisionName, allTeams);
      }
    }
    
    logInfo('AI team filling for late signup subdivisions completed');
  }

  /**
   * Generate AI teams for a late signup subdivision
   */
  private static async generateAITeamsForSubdivision(subdivisionName: string, teamCount: number): Promise<void> {
    const aiTeamNames = [
      'Shadow Runners', 'Storm Breakers', 'Iron Wolves', 'Fire Hawks',
      'Thunder Eagles', 'Crimson Tide', 'Golden Lions', 'Silver Falcons',
      'Lightning Bolts', 'Frost Giants', 'Ember Knights', 'Wind Dancers',
      'Steel Warriors', 'Flame Guardians', 'Night Stalkers', 'Dawn Riders'
    ];
    
    for (let i = 0; i < teamCount; i++) {
      const teamName = aiTeamNames[i % aiTeamNames.length];
      const uniqueTeamName = `${teamName} ${Math.floor(Math.random() * 900) + 100}`;
      
      try {
        // Create AI team
        const aiTeam = await storage.teams.createTeam({
          name: uniqueTeamName,
          userId: 'AI_USER_PROFILE', // Special AI user profile
          division: 8,
          subdivision: subdivisionName,
        });
        
        // Generate players for AI team
        await this.generateAIPlayersForTeam(aiTeam.id);
        
        logInfo(`Created AI team: ${uniqueTeamName} in ${subdivisionName}`);
      } catch (error) {
        console.error(`Failed to create AI team ${uniqueTeamName}:`, error);
      }
    }
  }

  /**
   * Generate AI players for a team
   */
  private static async generateAIPlayersForTeam(teamId: number): Promise<void> {
    const playerRoles = [
      'PASSER', 'PASSER', 'PASSER', // 3 Passers
      'RUNNER', 'RUNNER', 'RUNNER', 'RUNNER', // 4 Runners
      'BLOCKER', 'BLOCKER', 'BLOCKER', 'BLOCKER', 'BLOCKER' // 5 Blockers
    ];
    
    const races = ['HUMAN', 'SYLVAN', 'GRYLL', 'LUMINA', 'UMBRA'];
    const aiPlayerNames = [
      'Zara Nightblade', 'Kael Stormwind', 'Lyra Moonwhisper', 'Theron Ironforge',
      'Vex Shadowstep', 'Aria Lightbringer', 'Draven Frostborn', 'Nyx Starfall',
      'Orion Blazeheart', 'Sage Windrunner', 'Raven Darkwood', 'Atlas Goldspear'
    ];
    
    for (let i = 0; i < playerRoles.length; i++) {
      const playerName = aiPlayerNames[i % aiPlayerNames.length];
      const race = races[Math.floor(Math.random() * races.length)];
      const role = playerRoles[i];
      
      try {
        await storage.players.createPlayer({
          firstName: playerName.split(' ')[0],
          lastName: playerName.split(' ')[1],
          teamId: teamId,
          race: race as Race,
          role: role as PlayerRole,
          age: Math.floor(Math.random() * 10) + 20, // 20-30 years old
          speed: Math.floor(Math.random() * 15) + 10, // 10-25
          power: Math.floor(Math.random() * 15) + 10,
          throwing: Math.floor(Math.random() * 15) + 10,
          catching: Math.floor(Math.random() * 15) + 10,
          kicking: Math.floor(Math.random() * 15) + 10,
          stamina: Math.floor(Math.random() * 15) + 10,
          leadership: Math.floor(Math.random() * 15) + 10,
          agility: Math.floor(Math.random() * 15) + 10,
          injuryStatus: 'HEALTHY',
          staminaAttribute: Math.floor(Math.random() * 15) + 10,
          potentialRating: Math.floor(Math.random() * 20) + 50,
        });
      } catch (error) {
        console.error(`Failed to create AI player for team ${teamId}:`, error);
      }
    }
  }

  /**
   * Generate shortened season schedule for a late signup subdivision
   */
  private static async generateShortenedSeasonSchedule(subdivisionName: string, teamsInSubdivision: any[]): Promise<void> {
    const teams = teamsInSubdivision;
    
    if (teams.length !== 8) {
      logInfo(`Cannot generate schedule for ${subdivisionName} - has ${teams.length} teams instead of 8`);
      return;
    }
    
    const currentSeason = await storage.seasons.getCurrentSeason();
    if (!currentSeason) return;
    
    const { currentDayInCycle } = this.getCurrentSeasonInfo(currentSeason);
    const remainingDays = 17 - currentDayInCycle;
    
    if (remainingDays <= 0) return;
    
    // Generate round-robin schedule for remaining days
    const matches: any[] = [];
    const matchesPerDay = Math.floor(remainingDays / 3); // Spread matches over remaining days
    
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const dayOffset = matches.length % remainingDays;
        const gameDate = new Date();
        gameDate.setDate(gameDate.getDate() + dayOffset + 1);
        
        matches.push({
          homeTeamId: teams[i].id,
          awayTeamId: teams[j].id,
          gameDate: gameDate,
          leagueId: currentSeason.id,
          division: 8,
          subdivision: subdivisionName,
          matchType: 'LEAGUE',
          status: 'SCHEDULED'
        });
      }
    }
    
    // Create matches in database
    for (const match of matches) {
      try {
        await storage.matches.createMatch(match);
      } catch (error) {
        console.error(`Failed to create match for ${subdivisionName}:`, error);
      }
    }
    
    logInfo(`Generated ${matches.length} matches for ${subdivisionName} subdivision`);
  }
  
  /**
   * Process late signup team creation
   * Progressive process: Once 8 teams are in a subdivision, generate schedule immediately
   */
  static async processLateSignup(teamData: {
    userId: string;
    name: string;
  }): Promise<{
    team: any;
    subdivision: string;
    needsScheduleGeneration: boolean;
    scheduleGenerated: boolean;
  }> {
    // Verify we're in the late signup window
    const isLateSignupWindow = await this.isLateSignupWindow();
    if (!isLateSignupWindow) {
      throw new Error('Late signup window is closed. Late signup is only available between Day 1 3PM and Day 9 3PM.');
    }
    
    // Find appropriate late signup subdivision
    const subdivision = await this.findOrCreateLateSignupSubdivision();
    
    // Create the team in Division 8 late signup subdivision
    const team = await storage.teams.createTeam({
      userId: teamData.userId,
      name: teamData.name,
      division: 8,
      subdivision: subdivision,
    });
    
    // Check if subdivision is now full (8 teams)
    const teamsInSubdivision = await storage.teams.getTeamsByDivisionAndSubdivision(8, subdivision);
    const needsScheduleGeneration = teamsInSubdivision.length === 8;
    let scheduleGenerated = false;
    
    if (needsScheduleGeneration) {
      // Generate schedule immediately when subdivision is full
      await this.generateImmediateSeasonSchedule(subdivision, teamsInSubdivision);
      scheduleGenerated = true;
      
      logInfo(`Late signup subdivision ${subdivision} is full! Generated shortened season schedule immediately.`, {
        subdivision,
        teamsCount: teamsInSubdivision.length,
        scheduleGenerated: true
      });
    }
    
    logInfo(`Late signup team created`, {
      teamId: team.id,
      subdivision,
      teamsInSubdivision: teamsInSubdivision.length,
      scheduleGenerated,
      canStartSeason: scheduleGenerated
    });
    
    return {
      team,
      subdivision,
      needsScheduleGeneration,
      scheduleGenerated
    };
  }
  
  /**
   * Generate shortened season schedule for late signup subdivision
   * Called immediately when subdivision reaches 8 teams
   */
  static async generateImmediateSeasonSchedule(
    subdivision: string,
    teams: any[]
  ): Promise<void> {
    const currentSeason = await storage.seasons.getCurrentSeason();
    if (!currentSeason) return;
    
    const { currentDayInCycle, seasonNumber } = this.getCurrentSeasonInfo(currentSeason);
    
    // Calculate remaining days in regular season (until Day 14)
    const remainingDays = Math.max(0, 14 - currentDayInCycle + 1);
    
    if (remainingDays <= 0) {
      logInfo('No remaining days for shortened season schedule - too late in season');
      return;
    }
    
    // Create league for late signup subdivision
    const leagueId = `late-${subdivision}-${seasonNumber}`;
    
    // Check if league already exists
    const existingLeague = await prisma.league.findUnique({
      where: { id: parseInt(leagueId, 10) }
    });
    
    let league = existingLeague;
    if (!league) {
      league = await prisma.league.create({
        data: {
          seasonId: seasonNumber.toString(),
          division: 8,
          name: `Division 8 Late Signup - ${subdivision.toUpperCase()}`
        }
      });
    }
    
    // Generate shortened schedule
    const matches = await this.generateShortenedMatches(
      league.id,
      teams,
      seasonNumber,
      currentDayInCycle,
      remainingDays
    );
    
    logInfo(`🎯 SHORTENED SEASON SCHEDULE GENERATED IMMEDIATELY`, {
      leagueId: league.id,
      subdivision,
      teams: teams.length,
      matches: matches.length,
      remainingDays,
      startDay: currentDayInCycle,
      canStartNow: true
    });
  }
  
  /**
   * Generate shortened match schedule - ONE GAME PER TEAM PER DAY
   */
  private static async generateShortenedMatches(
    leagueId: number,
    teams: any[],
    season: number,
    startDay: number,
    remainingDays: number
  ): Promise<any[]> {
    const matches: any[] = [];
    const numTeams = teams.length;
    
    if (numTeams < 2) return matches;
    
    // Track which teams have been scheduled for each day
    const dailySchedules: Map<number, Set<number>> = new Map();
    
    // Initialize daily schedule tracking
    for (let day = startDay; day <= 14 && day < startDay + remainingDays; day++) {
      dailySchedules.set(day, new Set());
    }
    
    // Generate round-robin matchups
    const matchups = [];
    for (let i = 0; i < numTeams; i++) {
      for (let j = i + 1; j < numTeams; j++) {
        matchups.push([teams[i], teams[j]]);
      }
    }
    
    // Shuffle matchups for better distribution
    for (let i = matchups.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [matchups[i], matchups[j]] = [matchups[j], matchups[i]];
    }
    
    // Schedule matches ensuring ONE GAME PER TEAM PER DAY
    for (const [homeTeam, awayTeam] of matchups) {
      let scheduled = false;
      
      // Find the first available day where both teams are free
      for (let day = startDay; day <= 14 && day < startDay + remainingDays && !scheduled; day++) {
        const daySchedule = dailySchedules.get(day);
        if (!daySchedule) continue;
        
        // Check if both teams are available this day
        if (!daySchedule.has(homeTeam.id) && !daySchedule.has(awayTeam.id)) {
          // Schedule the match
          const match = await prisma.game.create({
            data: {
              homeTeamId: homeTeam.id,
              awayTeamId: awayTeam.id,
              leagueId: leagueId,
              gameDate: await this.calculateGameDate(day),
              status: 'SCHEDULED',
              matchType: 'LEAGUE'
            }
          });
          
          // Mark both teams as scheduled for this day
          daySchedule.add(homeTeam.id);
          daySchedule.add(awayTeam.id);
          
          matches.push(match);
          scheduled = true;
          
          console.log(`✓ Scheduled: ${homeTeam.name} vs ${awayTeam.name} on Day ${day}`);
        }
      }
      
      if (!scheduled) {
        console.warn(`⚠️ Could not schedule match: ${homeTeam.name} vs ${awayTeam.name} - no available days`);
      }
    }
    
    return matches;
  }
  
  /**
   * Calculate game date for a specific day in the season
   */
  private static async calculateGameDate(day: number): Promise<Date> {
    const currentSeason = await storage.seasons.getCurrentSeason();
    if (!currentSeason) return new Date();
    
    const seasonStartDate = currentSeason.startDateOriginal || currentSeason.startDate || new Date();
    const gameDate = new Date(seasonStartDate);
    gameDate.setDate(gameDate.getDate() + day - 1);
    
    // Set to random time within match simulation window (4-10 PM EST)
    const randomHour = 16 + Math.floor(Math.random() * 6); // 4-9 PM
    const randomMinute = Math.floor(Math.random() * 60);
    gameDate.setHours(randomHour, randomMinute, 0, 0);
    
    return gameDate;
  }
  
  /**
   * Get late signup statistics
   */
  static async getLateSignupStats(): Promise<{
    isLateSignupWindow: boolean;
    activeSubdivisions: Array<{
      subdivision: string;
      teamCount: number;
      isComplete: boolean;
    }>;
    totalLateSignupTeams: number;
  }> {
    const isLateSignupWindow = await this.isLateSignupWindow();
    
    // Get all late signup subdivisions
    const lateSignupSubdivisions = await prisma.team.findMany({
      where: {
        division: 8,
        subdivision: {
          startsWith: 'late_'
        }
      },
      select: {
        subdivision: true
      },
      distinct: ['subdivision']
    });
    
    const activeSubdivisions = [];
    let totalLateSignupTeams = 0;
    
    for (const { subdivision } of lateSignupSubdivisions) {
      if (subdivision) {
        const teams = await storage.teams.getTeamsByDivisionAndSubdivision(8, subdivision);
        activeSubdivisions.push({
          subdivision,
          teamCount: teams.length,
          isComplete: teams.length === 8
        });
        totalLateSignupTeams += teams.length;
      }
    }
    
    return {
      isLateSignupWindow,
      activeSubdivisions,
      totalLateSignupTeams
    };
  }
}