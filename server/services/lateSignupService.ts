import { getPrismaClient } from '../database.js';
import { storage } from '../storage/index.js';
import { logInfo } from './errorService.js';
import { Race, PlayerRole } from "../db";
import type { Team } from '@shared/types/models';


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
    // FIXED: Use proper 3AM EDT boundaries instead of simple 24-hour math
    const seasonStartDate = currentSeason.startDateOriginal || currentSeason.startDate || new Date("2025-08-16T15:40:19.081Z");
    
    // Import and use the production-ready day calculation
    const { calculateCurrentSeasonDay, calculateCurrentSeasonNumber } = require("../../shared/dayCalculation.js");
    const currentDayInCycle = calculateCurrentSeasonDay(seasonStartDate);
    const seasonNumber = calculateCurrentSeasonNumber(seasonStartDate);
    
    return { currentDayInCycle, seasonNumber };
  }
  
  /**
   * Find or create a late signup subdivision in Division 8
   */
  static async findOrCreateLateSignupSubdivision(): Promise<string> {
    const greekAlphabet = [
      "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta",
      "iota", "kappa", "lambda", "mu", "nu", "xi", "omicron", "pi",
      "rho", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega"
    ];
    
    // Get existing late signup subdivisions in Division 8
    const existingSubdivisions = await this.getExistingLateSignupSubdivisions();
    
    // Find a subdivision that's not full (< 8 teams)
    for (const { subdivision, teamCount } of existingSubdivisions) {
      if (teamCount < 8) {
        return subdivision;
      }
    }
    
    // All subdivisions are full, create a new one using Greek alphabet
    const usedSubdivisions = new Set(existingSubdivisions.map(s => s.subdivision));
    
    // First try base names (alpha, beta, gamma, etc.)
    for (const baseName of greekAlphabet) {
      if (!usedSubdivisions.has(baseName)) {
        return baseName;
      }
    }
    
    // If all base names are used, try numbered extensions (alpha_1, beta_2, etc.)
    for (const baseName of greekAlphabet) {
      for (let i = 1; i <= 100; i++) {
        const numberedName = `${baseName}_${i}`;
        if (!usedSubdivisions.has(numberedName)) {
          return numberedName;
        }
      }
    }
    
    // Fallback to overflow pattern if all Greek names are exhausted
    const overflowId = Date.now().toString().slice(-6);
    return `overflow_${overflowId}`;
  }

  /**
   * Process daily late signups - Fill incomplete subdivisions with AI teams EVERY day
   * Called daily at 3PM EDT during the entire late signup window (Days 1-9)
   */
  static async processDailyLateSignups(currentDay: number): Promise<void> {
    logInfo(`🤖 DAILY AI FILLING: Starting daily late signup processing for Day ${currentDay} - Filling incomplete subdivisions with AI teams`);
    
    try {
      // Get all existing late signup subdivisions
      const existingSubdivisions = await this.getExistingLateSignupSubdivisions();
      logInfo(`Found ${existingSubdivisions.length} existing late signup subdivisions: ${existingSubdivisions.map(s => `${s.subdivision}(${s.teamCount})`).join(', ')}`);
      
      // CRITICAL FIX: If no existing subdivisions found, also check Division 8 for any teams
      if (existingSubdivisions.length === 0) {
        logInfo(`No existing subdivisions found - checking for any Division 8 teams...`);
        const allDivision8Teams = await storage.teams.getTeamsByDivisionAndSubdivision(8);
        if (allDivision8Teams.length > 0) {
          logInfo(`Found ${allDivision8Teams.length} teams in Division 8 - organizing by subdivision`);
          
          // Group teams by subdivision
          const teamsBySubdivision = new Map<string, any[]>();
          for (const team of allDivision8Teams) {
            const subdivision = team.subdivision || 'alpha';
            if (!teamsBySubdivision.has(subdivision)) {
              teamsBySubdivision.set(subdivision, []);
            }
            teamsBySubdivision.get(subdivision)!.push(team);
          }
          
          // Process each subdivision
          for (const [subdivision, teams] of teamsBySubdivision.entries()) {
            logInfo(`Processing subdivision ${subdivision} with ${teams.length} teams`);
            
            if (teams.length > 0 && teams.length < 8) {
              const aiTeamsNeeded = 8 - teams.length;
              logInfo(`🤖 DIRECT PROCESSING: Adding ${aiTeamsNeeded} AI teams to ${subdivision} (${teams.length}/8 teams) on Day ${currentDay}`);
              
              await this.generateAITeamsForSubdivision(subdivision, aiTeamsNeeded);
              
              // Generate shortened schedule immediately when subdivision becomes full
              const allTeams = await storage.teams.getTeamsByDivisionAndSubdivision(8, subdivision);
              await this.generateShortenedSeasonSchedule(subdivision, allTeams);
              
              logInfo(`✅ Subdivision ${subdivision} now COMPLETE (8/8) with AI filling - Schedule generated for Days ${currentDay}-14`);
            }
          }
        } else {
          logInfo(`No teams found in Division 8 - nothing to process`);
        }
      } else {
        // Check each subdivision and fill with AI if it has teams but isn't full - DAILY FILLING
        for (const subdivision of existingSubdivisions) {
          const teams = await storage.teams.getTeamsByDivisionAndSubdivision(8, subdivision.subdivision);
          logInfo(`Subdivision ${subdivision.subdivision}: Found ${teams.length} teams (expected ${subdivision.teamCount})`);
          
          if (teams.length > 0 && teams.length < 8) {
            // Subdivision has teams but isn't full - fill with AI teams EVERY day
            const aiTeamsNeeded = 8 - teams.length;
            logInfo(`🤖 DAILY AI FILLING: Adding ${aiTeamsNeeded} AI teams to ${subdivision.subdivision} (${teams.length}/8 teams) on Day ${currentDay}`);
            
            await this.generateAITeamsForSubdivision(subdivision.subdivision, aiTeamsNeeded);
            
            // Generate shortened schedule immediately when subdivision becomes full
            const allTeams = await storage.teams.getTeamsByDivisionAndSubdivision(8, subdivision.subdivision);
            await this.generateShortenedSeasonSchedule(subdivision.subdivision, allTeams);
            
            logInfo(`✅ Subdivision ${subdivision.subdivision} now COMPLETE (8/8) with AI filling - Schedule generated for Days ${currentDay}-14`);
          } else if (teams.length === 8) {
            logInfo(`✅ Subdivision ${subdivision.subdivision} already complete (8/8 teams)`);
            
            // Check if schedule exists, generate if missing
            const existingMatches = await this.checkExistingMatches(subdivision.subdivision);
            if (existingMatches === 0) {
              logInfo(`No schedule found for complete subdivision ${subdivision.subdivision} - generating schedule`);
              await this.generateShortenedSeasonSchedule(subdivision.subdivision, teams);
            }
          } else if (teams.length === 0) {
            logInfo(`⚠️ Subdivision ${subdivision.subdivision} reported in database but no teams found`);
          }
        }
      }
      
      logInfo(`🎯 Daily late signup processing completed for Day ${currentDay} - All incomplete subdivisions filled with AI teams`);
    } catch (error) {
      console.error('❌ CRITICAL ERROR in daily late signup processing:', error);
      throw error; // Re-throw to ensure errors are visible
    }
  }
  
  /**
   * Get all existing late signup subdivisions
   */
  private static async getExistingLateSignupSubdivisions(): Promise<Array<{ subdivision: string; teamCount: number }>> {
    const greekAlphabet = [
      "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta",
      "iota", "kappa", "lambda", "mu", "nu", "xi", "omicron", "pi",
      "rho", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega"
    ];
    
    const prisma = await getPrismaClient();
    
    // Find all Division 8 subdivisions that match Greek alphabet pattern or overflow pattern
    const subdivisions = await prisma.team.findMany({
      where: {
        division: 8,
        OR: [
          // Base Greek names (alpha, beta, etc.)
          { subdivision: { in: greekAlphabet } },
          // Numbered Greek names (alpha_1, beta_2, etc.)
          ...greekAlphabet.map(name => ({ subdivision: { startsWith: `${name}_` } })),
          // Overflow pattern (overflow_123456)
          { subdivision: { startsWith: 'overflow_' } }
        ]
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
    
    logInfo(`Found ${result.length} late signup subdivisions: ${result.map(r => `${r.subdivision}(${r.teamCount})`).join(', ')}`);
    return result;
  }

  /**
   * Check existing matches for a subdivision
   */
  private static async checkExistingMatches(subdivisionName: string): Promise<number> {
    try {
      const prisma = await getPrismaClient();
      // Query Game table instead of non-existent match table
      const teamIds = await storage.teams.getTeamsByDivisionAndSubdivision(8, subdivisionName);
      const teamIdList = teamIds.map(t => t.id);
      
      const existingMatches = await prisma.game.count({
        where: {
          matchType: 'LEAGUE',
          OR: [
            { homeTeamId: { in: teamIdList } },
            { awayTeamId: { in: teamIdList } }
          ]
        }
      });
      
      logInfo(`Subdivision ${subdivisionName} has ${existingMatches} existing matches`);
      return existingMatches;
    } catch (error) {
      console.error(`Error checking existing matches for ${subdivisionName}:`, error);
      return 0;
    }
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
    
    const lateSignupSubdivisions = ["alpha", "beta", "gamma", "delta"];
    
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
  public static async generateAITeamsForSubdivision(subdivisionName: string, teamCount: number): Promise<void> {
    const aiTeamNames = [
      'Iron Wolves', 'Fire Hawks', 'Thunder Eagles', 'Crimson Tide', 
      'Golden Lions', 'Silver Falcons', 'Lightning Bolts', 'Frost Giants', 
      'Ember Knights', 'Wind Dancers', 'Steel Warriors', 'Flame Guardians', 
      'Night Stalkers', 'Dawn Riders', 'Storm Breakers', 'Void Hunters'
    ];
    
    logInfo(`🤖 GENERATING ${teamCount} AI teams for subdivision ${subdivisionName}`);
    
    for (let i = 0; i < teamCount; i++) {
      const teamName = aiTeamNames[i % aiTeamNames.length];
      const uniqueTeamName = `${teamName} ${Math.floor(Math.random() * 900) + 100}`;
      
      try {
        // FIXED: Each AI team gets a unique userId to avoid constraint violations
        const uniqueAIUserId = `ai_team_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        
        logInfo(`Creating AI team: ${uniqueTeamName} with userId: ${uniqueAIUserId}`);
        
        // Create AI team with unique userId and proper AI flag
        const aiTeam = await storage.teams.createAITeam({
          name: uniqueTeamName,
          userId: uniqueAIUserId,
          division: 8,
          subdivision: subdivisionName,
        });
        
        logInfo(`AI team created with ID: ${aiTeam.id} - generating players...`);
        
        // Generate players for AI team
        await this.generateAIPlayersForTeam(aiTeam.id);
        
        logInfo(`✅ Created AI team: ${uniqueTeamName} in ${subdivisionName} with ${12} players`);
        
        // Add a small delay to ensure unique timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
        
      } catch (error) {
        console.error(`❌ Failed to create AI team ${uniqueTeamName}:`, error);
        console.error('Full error details:', error);
        throw error; // Re-throw to ensure the error is visible
      }
    }
    
    logInfo(`🎯 Successfully generated ${teamCount} AI teams for subdivision ${subdivisionName}`);
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
        await storage?.players.createPlayer({
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
   * Generate pairing patterns for 8 teams over dynamic game days
   * Each team plays once per day, balanced HOME/AWAY distribution
   */
  private static generateDynamicPairingPatterns(gameDays: number): number[][][] {
    // Round-robin base patterns for 8 teams (each team plays once per day)
    const basePatterns = [
      [[0,4], [1,5], [2,6], [3,7]], // Day 1: Team pairs
      [[0,5], [1,6], [2,7], [3,4]], // Day 2: Different combinations  
      [[0,6], [1,7], [2,4], [3,5]], // Day 3: Rotate pairings
      [[0,7], [1,4], [2,5], [3,6]], // Day 4: Continue rotation
      [[0,1], [2,3], [4,5], [6,7]], // Day 5: New pattern
      [[0,2], [1,3], [4,6], [5,7]], // Day 6: Different pairs
      [[0,3], [1,2], [4,7], [5,6]], // Day 7: Continue pattern
    ];
    
    const dailyPairs: number[][][] = [];
    const homeAwayTracker = new Map<number, { home: number, away: number }>();
    
    // Initialize HOME/AWAY tracking
    for (let i = 0; i < 8; i++) {
      homeAwayTracker.set(i, { home: 0, away: 0 });
    }
    
    for (let day = 0; day < gameDays; day++) {
      // Use base patterns cyclically, with HOME/AWAY assignment
      const patternIndex = day % basePatterns.length;
      const dayMatches: number[][] = [];
      
      basePatterns[patternIndex].forEach(([team1, team2]) => {
        // Determine HOME/AWAY based on current balance
        const team1Stats = homeAwayTracker.get(team1)!;
        const team2Stats = homeAwayTracker.get(team2)!;
        
        // Prefer the team with fewer home games as home team
        let homeTeam = team1;
        let awayTeam = team2;
        
        if (team2Stats.home < team1Stats.home) {
          homeTeam = team2;
          awayTeam = team1;
        } else if (team1Stats.home === team2Stats.home) {
          // Equal home games, coin flip
          if (Math.random() < 0.5) {
            homeTeam = team2;
            awayTeam = team1;
          }
        }
        
        dayMatches.push([homeTeam, awayTeam]);
        
        // Update tracking
        homeAwayTracker.get(homeTeam)!.home++;
        homeAwayTracker.get(awayTeam)!.away++;
      });
      
      dailyPairs.push(dayMatches);
    }
    
    logInfo(`🎲 Generated ${gameDays}-day schedule with balanced HOME/AWAY`);
    logInfo(`🏠 HOME/AWAY distribution:`, Array.from(homeAwayTracker.entries())
      .map(([team, stats]) => `Team ${team}: ${stats.home}H/${stats.away}A`).join(', '));
    
    return dailyPairs;
  }

  /**
   * Generate shortened season schedule for a late signup subdivision - EXPOSED FOR TESTING
   */
  static async generateShortenedSeasonSchedule(subdivisionName: string, teamsInSubdivision: any[]): Promise<void> {
    const teams = teamsInSubdivision;
    
    if (teams.length !== 8) {
      logInfo(`Cannot generate schedule for ${subdivisionName} - has ${teams.length} teams instead of 8`);
      return;
    }
    
    const currentSeason = await storage.seasons.getCurrentSeason();
    if (!currentSeason) return;
    
    const { currentDayInCycle } = this.getCurrentSeasonInfo(currentSeason);
    
    // DYNAMIC: Late signup teams start games based on when subdivision is filled
    // Games start the day the subdivision gets filled with AI teams
    const gameStartDay = currentDayInCycle; // Start the day subdivision is filled
    const gameEndDay = 14; // Season ends Day 14
    const remainingGameDays = Math.max(0, gameEndDay - gameStartDay + 1);
    
    if (remainingGameDays <= 0) {
      logInfo(`Cannot generate schedule for ${subdivisionName} - season has already ended (current day ${currentDayInCycle})`);
      return;
    }
    
    logInfo(`🗓️ Generating shortened season for ${subdivisionName}: Days ${gameStartDay}-${gameEndDay} (${remainingGameDays} days, ${remainingGameDays} games per team)`);
    logInfo(`📊 SCHEDULE DEBUG: gameStartDay=${gameStartDay}, gameEndDay=${gameEndDay}, remainingGameDays=${remainingGameDays}`);
    logInfo(`👥 TEAMS DEBUG: ${teams.length} teams found:`, teams.map(t => `${t.id}:${t.name}`).join(', '));
    
    // CORRECTED: Generate exactly 4 matches per day (each team plays once)
    const matches: any[] = [];
    
    // GUARANTEED APPROACH: Pre-defined pairing patterns ensuring exactly 1 game per team per day
    const teamPairings = [];
    
    // DYNAMIC: Generate balanced pairing patterns 
    const schedulePatternsData = this.generateDynamicPairingPatterns(remainingGameDays);
    
    for (let dayIndex = 0; dayIndex < remainingGameDays; dayIndex++) {
      const dailyPairs = schedulePatternsData[dayIndex % schedulePatternsData.length]; // Safety wrap
      teamPairings.push(dailyPairs);
      
      logInfo(`📋 Day ${gameStartDay + dayIndex} (index ${dayIndex}): Using pattern ${dayIndex % schedulePatternsData.length}`);
      
      // Verify no duplicates (guaranteed by pre-calculated patterns)
      const teamsUsedToday = new Set();
      dailyPairs.forEach((pair: number[]) => {
        const [a, b] = pair;
        teamsUsedToday.add(a);
        teamsUsedToday.add(b);
      });
      
      logInfo(`📅 Day ${gameStartDay + dayIndex} pairs (${teamsUsedToday.size}/8 teams used):`, 
        dailyPairs.map((pair: number[]) => {
          const [a, b] = pair;
          return `${teams[a]?.name} vs ${teams[b]?.name}`;
        }).join(' | '));
        
      if (teamsUsedToday.size !== 8) {
        logInfo(`❌ ERROR: Day ${gameStartDay + dayIndex} has ${teamsUsedToday.size} teams instead of 8!`);
      }
    }
    
    // Generate matches for each game day
    for (let dayIndex = 0; dayIndex < remainingGameDays; dayIndex++) {
      const actualGameDay = gameStartDay + dayIndex;
      const gameDate = new Date(currentSeason.startDate);
      gameDate.setDate(gameDate.getDate() + actualGameDay - 1);
      
      logInfo(`🎲 MATCH CREATION DEBUG Day ${actualGameDay} (index ${dayIndex}): gameDate=${gameDate.toISOString()}`);
      
      if (actualGameDay === 14) {
        logInfo(`🔥 DAY 14 DEBUG: Creating games for ${gameDate.toISOString()}, expected Day 14 date should be 2025-08-29T00:00:00.000Z`);
      }
      
      // Concentrated time slots within subdivision, spread across server
      // Using subdivision name to distribute times across 4:00-10:00 PM EDT
      const subdivisionOffset = (subdivisionName.charCodeAt(0) || 97) - 97; // 'alpha'=0, 'beta'=1, etc.
      const baseHour = 20 + (subdivisionOffset % 7); // 20-26 UTC (4:00-10:00 PM EDT)
      
      const timeSlots = [
        { hour: baseHour, minute: 0 },        // Game 1
        { hour: baseHour, minute: 15 },       // Game 2 
        { hour: baseHour, minute: 30 },       // Game 3
        { hour: baseHour, minute: 45 }        // Game 4
      ];
      
      const dailyPairs = teamPairings[dayIndex];
      logInfo(`📝 Creating ${dailyPairs.length} matches for Day ${actualGameDay}`);
      
      for (let matchIndex = 0; matchIndex < dailyPairs.length && matchIndex < 4; matchIndex++) {
        const [homeIndex, awayIndex] = dailyPairs[matchIndex];
        const gameTime = timeSlots[matchIndex];
        
        // Set proper game date and time
        const scheduledDateTime = new Date(gameDate);
        scheduledDateTime.setHours(gameTime.hour, gameTime.minute, 0, 0);
        
        const matchData = {
          homeTeamId: teams[homeIndex].id,
          awayTeamId: teams[awayIndex].id,
          gameDate: scheduledDateTime,
          matchType: 'LEAGUE',
          status: 'SCHEDULED',
          leagueId: null
        };
        
        matches.push(matchData);
        logInfo(`   ⚽ Match ${matchIndex + 1}: ${teams[homeIndex].name} (${teams[homeIndex].id}) vs ${teams[awayIndex].name} (${teams[awayIndex].id}) @ ${scheduledDateTime.toLocaleString()}`);
      }
    }
    
    logInfo(`🎯 TOTAL MATCHES CREATED: ${matches.length} matches ready for database insertion`);
    
    // DIAGNOSTIC: Check for Oakland Cougars specifically
    const oaklandCougarsId = teams.find(t => t.name.includes('Oakland'))?.id;
    if (oaklandCougarsId) {
      const oaklandMatches = matches.filter(m => m.homeTeamId === oaklandCougarsId || m.awayTeamId === oaklandCougarsId);
      logInfo(`🎯 OAKLAND COUGARS DEBUG: Found ${oaklandMatches.length} matches before database insert`);
      oaklandMatches.forEach((match, index) => {
        const opponent = match.homeTeamId === oaklandCougarsId 
          ? teams.find(t => t.id === match.awayTeamId)?.name 
          : teams.find(t => t.id === match.homeTeamId)?.name;
        logInfo(`   ${index + 1}. vs ${opponent} on ${match.gameDate.toDateString()} @ ${match.gameDate.toLocaleTimeString()}`);
      });
    }
    
    // Create matches in database - FIXED: Use direct Prisma insertion
    let createdMatches = 0;
    const prisma = await getPrismaClient();
    
    for (const match of matches) {
      try {
        const createdMatch = await prisma.game.create({
          data: {
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            gameDate: match.gameDate,
            matchType: match.matchType,
            status: match.status || 'SCHEDULED',
            leagueId: match.leagueId
          }
        });
        createdMatches++;
        logInfo(`   ✅ Created match ID ${createdMatch.id}: ${match.gameDate.toISOString()}`);
      } catch (error) {
        console.error(`❌ Failed to create match for ${subdivisionName}:`, error);
        logInfo(`   📊 Match data:`, match);
      }
    }
    
    const expectedTotalMatches = remainingGameDays * 4; // 4 matches per day
    const expectedGamesPerTeam = remainingGameDays; // 1 game per team per day
    
    logInfo(`✅ FINAL RESULT: Generated ${createdMatches}/${expectedTotalMatches} matches for ${subdivisionName} subdivision (${expectedGamesPerTeam} games per team over ${remainingGameDays} days)`);
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
    const prisma = await getPrismaClient();
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
    const prisma = await getPrismaClient();
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
    
    // Get all late signup subdivisions using Greek alphabet system
    const greekAlphabet = [
      "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta",
      "iota", "kappa", "lambda", "mu", "nu", "xi", "omicron", "pi",
      "rho", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega"
    ];
    
    const prisma = await getPrismaClient();
    const lateSignupSubdivisions = await prisma.team.findMany({
      where: {
        division: 8,
        OR: [
          // Base Greek names (alpha, beta, etc.)
          { subdivision: { in: greekAlphabet } },
          // Numbered Greek names (alpha_1, beta_2, etc.)
          ...greekAlphabet.map(name => ({ subdivision: { startsWith: `${name}_` } })),
          // Overflow pattern (overflow_123456)
          { subdivision: { startsWith: 'overflow_' } }
        ]
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