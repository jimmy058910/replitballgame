/**
 * Quick Match Simulation - Summary-Based Results
 * 
 * Simplified simulation that maintains all game mechanics while generating
 * instant results for development and testing purposes.
 * 
 * Includes: Stats, Injuries, Stamina, Camaraderie, Coaching, Equipment,
 * Race Effects, Tactical Systems, Stadium Effects, and Player Progression
 */

import { getPrismaClient } from '../database.js';
import { CamaraderieService } from './camaraderieService.js';
import { logInfo, logError } from './errorService.js';

// Constants for simulation configuration
const DEFAULT_STAT_VALUE = 20;
const MAIN_ROSTER_SIZE = 12;
const MAX_PERFORMANCE_RATING = 100;
const DEFAULT_STADIUM_CAPACITY = 5000;
const DEFAULT_ATMOSPHERE = 50;
const BASE_MATCH_DURATION = 60;

export interface QuickSimulationResult {
  matchId: string;
  finalScore: { home: number; away: number };
  matchDuration: number;
  winner: 'home' | 'away' | 'draw';
  playerStats: PlayerMatchStats[];
  injuries: PlayerInjury[];
  staminaChanges: StaminaUpdate[];
  revenueGenerated: number;
  mvpPlayer: string;
  matchSummary: string;
  teamEffects: {
    home: TeamMatchEffects;
    away: TeamMatchEffects;
  };
  keyEvents: MatchEvent[];
}

export interface PlayerMatchStats {
  playerId: string;
  playerName: string;
  role: string;
  rushing: number;
  passing: number;
  catching: number;
  blocking: number;
  tackleAttempts: number;
  tackleSuccesses: number;
  fumbles: number;
  interceptions: number;
  touchdowns: number;
  timeOnField: number;
  staminaUsed: number;
  performanceRating: number;
  camaraderieContribution: number;
}

export interface PlayerInjury {
  playerId: string;
  playerName: string;
  injuryType: 'minor' | 'moderate' | 'severe';
  affectedStat: string;
  duration: number; // days
  description: string;
}

export interface StaminaUpdate {
  playerId: string;
  playerName: string;
  staminaBefore: number;
  staminaAfter: number;
  staminaUsed: number;
  recoveryTime: number; // hours
}

export interface TeamMatchEffects {
  camaraderieLevel: number;
  camaraderieBonus: { catching: number; agility: number; passAccuracy: number; fumbleRisk: number };
  tacticalEffectiveness: number;
  coachingBonus: number;
  stadiumAtmosphere: number;
  equipmentBonuses: number;
  raceEffectBonuses: number;
}

export interface MatchEvent {
  minute: number;
  type: 'touchdown' | 'fumble' | 'interception' | 'injury' | 'substitution' | 'tactical_shift';
  description: string;
  playersInvolved: string[];
}

export class QuickMatchSimulation {
  
  /**
   * Run complete match simulation and return comprehensive results
   */
  static async simulateMatch(matchId: string): Promise<QuickSimulationResult> {
    try {
      const prisma = await getPrismaClient();
      
      logInfo("Starting quick match simulation", { matchId });

      // 1. Load match data
      const match = await prisma.game.findFirst({
        where: { id: parseInt(matchId) },
        include: {
          homeTeam: {
            include: {
              players: {
                where: { isRetired: false, isOnMarket: false },
                orderBy: { createdAt: 'asc' }
              },
              staff: true,
              stadium: true
            }
          },
          awayTeam: {
            include: {
              players: {
                where: { isRetired: false, isOnMarket: false },
                orderBy: { createdAt: 'asc' }
              },
              staff: true
            }
          }
        }
      });

      if (!match) {
        throw new Error(`Match ${matchId} not found`);
      }

      // 2. Calculate team effects (camaraderie, coaching, tactics)
      const homeEffects = await this.calculateTeamEffects(match.homeTeam);
      const awayEffects = await this.calculateTeamEffects(match.awayTeam);

      // 3. Simulate match outcome based on team strengths and effects
      const matchResult = await this.calculateMatchOutcome(
        match.homeTeam,
        match.awayTeam,
        homeEffects,
        awayEffects
      );

      // 4. Generate player statistics
      const playerStats = await this.generatePlayerStats(
        match.homeTeam.players,
        match.awayTeam.players,
        homeEffects,
        awayEffects,
        matchResult
      );

      // 5. Process injuries based on game events and camaraderie
      const injuries = await this.processInjuries(
        [...match.homeTeam.players, ...match.awayTeam.players],
        homeEffects,
        awayEffects,
        matchResult.intensity
      );

      // 6. Calculate stamina depletion
      const staminaChanges = await this.calculateStaminaChanges(
        [...match.homeTeam.players, ...match.awayTeam.players],
        homeEffects.tacticalEffectiveness + awayEffects.tacticalEffectiveness,
        matchResult.matchDuration
      );

      // 7. Calculate revenue (attendance, atmosphere, performance)
      const revenueGenerated = this.calculateMatchRevenue(
        match.homeTeam,
        homeEffects.stadiumAtmosphere,
        matchResult.homeScore,
        matchResult.awayScore
      );

      // 8. Determine MVP
      const mvpPlayer = this.determineMVP(playerStats);

      // 9. Generate key events and match summary
      const keyEvents = this.generateKeyEvents(matchResult, playerStats, injuries);
      const matchSummary = this.generateMatchSummary(
        match.homeTeam,
        match.awayTeam,
        matchResult,
        mvpPlayer,
        keyEvents
      );

      // 10. Update post-game camaraderie
      await CamaraderieService.updatePostGameCamaraderie(
        match.homeTeamId.toString(),
        match.awayTeamId.toString(),
        matchResult.homeScore,
        matchResult.awayScore,
        match.matchType as 'LEAGUE' | 'EXHIBITION' | 'TOURNAMENT'
      );

      const result: QuickSimulationResult = {
        matchId,
        finalScore: { home: matchResult.homeScore, away: matchResult.awayScore },
        matchDuration: matchResult.matchDuration,
        winner: matchResult.homeScore > matchResult.awayScore ? 'home' : 
                matchResult.awayScore > matchResult.homeScore ? 'away' : 'draw',
        playerStats,
        injuries,
        staminaChanges,
        revenueGenerated,
        mvpPlayer,
        matchSummary,
        teamEffects: { home: homeEffects, away: awayEffects },
        keyEvents
      };

      logInfo("Quick match simulation completed", { 
        matchId, 
        finalScore: result.finalScore,
        injuries: injuries.length,
        mvp: mvpPlayer
      });

      return result;

    } catch (error) {
      logError(error as Error, undefined, { matchId, operation: 'simulateMatch' });
      throw error;
    }
  }

  /**
   * Calculate comprehensive team effects including camaraderie, coaching, tactics
   */
  private static async calculateTeamEffects(team: any): Promise<TeamMatchEffects> {
    // Get camaraderie effects
    const camaraderieEffects = await CamaraderieService.getCamaraderieEffects(team.id.toString());
    
    // Get coaching bonus from head coach
    const headCoach = team.staff.find((s: any) => s.type === 'HEAD_COACH');
    const coachingBonus = headCoach ? (headCoach.tactics || DEFAULT_STAT_VALUE) * 0.5 : 0;
    
    // Calculate tactical effectiveness (coach tactics + camaraderie)
    const tacticalEffectiveness = Math.min(100, 
      (headCoach?.tactics || DEFAULT_STAT_VALUE) + (camaraderieEffects.teamCamaraderie * 0.3)
    );

    // Stadium atmosphere (home field advantage)
    const stadium = team.stadium;
    const stadiumAtmosphere = stadium ? 
      Math.min(100, (stadium.capacity || DEFAULT_STADIUM_CAPACITY) / 100 + Math.random() * 20) : DEFAULT_ATMOSPHERE;

    // Equipment bonuses (average from players)
    const equipmentBonuses = team.players.reduce((sum: number, player: any) => {
      return sum + (player.equipmentBonuses || 0);
    }, 0) / Math.max(1, team.players.length);

    // Race effect bonuses (diversity bonus)
    const uniqueRaces = new Set(team.players.map((p: any) => p.race)).size;
    const raceEffectBonuses = Math.min(15, uniqueRaces * 2); // Max 15% bonus for diversity

    return {
      camaraderieLevel: camaraderieEffects.teamCamaraderie,
      camaraderieBonus: camaraderieEffects.inGameStatBonus,
      tacticalEffectiveness,
      coachingBonus,
      stadiumAtmosphere,
      equipmentBonuses,
      raceEffectBonuses
    };
  }

  /**
   * Calculate match outcome based on team strengths and all modifiers
   */
  private static async calculateMatchOutcome(
    homeTeam: any,
    awayTeam: any,
    homeEffects: TeamMatchEffects,
    awayEffects: TeamMatchEffects
  ): Promise<{
    homeScore: number;
    awayScore: number;
    matchDuration: number;
    intensity: number;
  }> {
    // Calculate base team strength from player stats
    const homeStrength = this.calculateTeamStrength(homeTeam.players);
    const awayStrength = this.calculateTeamStrength(awayTeam.players);

    // Apply all modifiers
    const homeModifiedStrength = homeStrength * 
      (1 + homeEffects.tacticalEffectiveness / 100) *
      (1 + homeEffects.coachingBonus / 100) *
      (1 + homeEffects.stadiumAtmosphere / 200) * // Home field advantage
      (1 + homeEffects.equipmentBonuses / 100) *
      (1 + homeEffects.raceEffectBonuses / 100) *
      (1 + (homeEffects.camaraderieBonus.catching + homeEffects.camaraderieBonus.agility) / 200);

    const awayModifiedStrength = awayStrength * 
      (1 + awayEffects.tacticalEffectiveness / 100) *
      (1 + awayEffects.coachingBonus / 100) *
      (1 + awayEffects.equipmentBonuses / 100) *
      (1 + awayEffects.raceEffectBonuses / 100) *
      (1 + (awayEffects.camaraderieBonus.catching + awayEffects.camaraderieBonus.agility) / 200);

    // Calculate strength differential and base scores
    const strengthRatio = homeModifiedStrength / awayModifiedStrength;
    const randomFactor = 0.8 + Math.random() * 0.4; // 80%-120% randomness

    // Generate realistic scores based on strength differential
    let homeScore: number, awayScore: number;
    
    if (strengthRatio > 1.3) {
      // Strong home team
      homeScore = Math.floor(14 + Math.random() * 14) * randomFactor;
      awayScore = Math.floor(3 + Math.random() * 10) * randomFactor;
    } else if (strengthRatio < 0.7) {
      // Strong away team
      homeScore = Math.floor(3 + Math.random() * 10) * randomFactor;
      awayScore = Math.floor(14 + Math.random() * 14) * randomFactor;
    } else {
      // Close match
      const baseScore = 7 + Math.random() * 14;
      homeScore = Math.floor(baseScore * strengthRatio * randomFactor);
      awayScore = Math.floor(baseScore * (2 - strengthRatio) * randomFactor);
    }

    // Ensure realistic score bounds
    homeScore = Math.max(0, Math.min(35, homeScore));
    awayScore = Math.max(0, Math.min(35, awayScore));

    // Match intensity affects injury chances and stamina depletion
    const scoreDiff = Math.abs(homeScore - awayScore);
    const intensity = Math.max(50, 100 - scoreDiff * 5); // Closer games = higher intensity

    return {
      homeScore: Math.floor(homeScore),
      awayScore: Math.floor(awayScore),
      matchDuration: 60 + Math.floor(Math.random() * 10), // 60-70 minutes
      intensity
    };
  }

  /**
   * Calculate base team strength from player stats
   */
  private static calculateTeamStrength(players: any[]): number {
    if (!players?.length) return 50;

    const mainRoster = players.slice(0, 12); // Focus on main roster
    
    if (mainRoster.length === 0) return 50;
    
    return mainRoster.reduce((total, player) => {
      const avgStat = (
        (player.rushingAttribute || 20) + (player.passingAttribute || 20) + 
        (player.catchingAttribute || 20) + (player.blockingAttribute || 20) + (player.tacklingAttribute || 20)
      ) / 5;
      return total + avgStat;
    }, 0) / mainRoster.length;
  }

  /**
   * Generate detailed player statistics based on match events
   */
  private static async generatePlayerStats(
    homePlayers: any[],
    awayPlayers: any[],
    homeEffects: TeamMatchEffects,
    awayEffects: TeamMatchEffects,
    matchResult: any
  ): Promise<PlayerMatchStats[]> {
    const allPlayers = [
      ...homePlayers.map(p => ({ ...p, teamSide: 'home', effects: homeEffects })),
      ...awayPlayers.map(p => ({ ...p, teamSide: 'away', effects: awayEffects }))
    ];

    return allPlayers.slice(0, 24).map(player => { // Top 12 from each team
      // Apply camaraderie and coaching effects to performance
      const effectMultiplier = 1 + (player.effects.tacticalEffectiveness / 100) + 
                               (player.effects.camaraderieBonus.catching / 100);
      
      // Role-based stat generation
      const roleMultipliers = this.getRoleMultipliers(player.role);
      
      // Generate stats based on player attributes and effects
      const rushing = Math.floor((player.rushingAttribute || 20) * roleMultipliers.rushing * effectMultiplier * Math.random() * 0.1);
      const passing = Math.floor((player.passingAttribute || 20) * roleMultipliers.passing * effectMultiplier * Math.random() * 0.1);
      const catching = Math.floor((player.catchingAttribute || 20) * roleMultipliers.catching * effectMultiplier * Math.random() * 0.1);
      const blocking = Math.floor((player.blockingAttribute || 20) * roleMultipliers.blocking * effectMultiplier * Math.random() * 0.05);
      const tackling = Math.floor((player.tacklingAttribute || 20) * roleMultipliers.tackling * effectMultiplier * Math.random() * 0.05);

      // Calculate performance rating
      const performanceRating = Math.min(100, Math.max(0, 
        (rushing + passing + catching + blocking + tackling) * 2 + 
        (player.effects.camaraderieLevel - 50) * 0.5
      ));

      return {
        playerId: player.id.toString(),
        playerName: `${player.firstName} ${player.lastName}`,
        role: player.role,
        rushing,
        passing,
        catching,
        blocking,
        tackleAttempts: tackling + Math.floor(Math.random() * 3),
        tackleSuccesses: tackling,
        fumbles: Math.floor(Math.random() * 2 + (player.effects.camaraderieBonus.fumbleRisk || 0)),
        interceptions: Math.floor(Math.random() * 1),
        touchdowns: Math.floor(Math.random() * 2),
        timeOnField: 45 + Math.floor(Math.random() * 15), // Minutes
        staminaUsed: 20 + Math.floor(Math.random() * 30),
        performanceRating,
        camaraderieContribution: Math.max(-5, Math.min(5, (player.camaraderieScore || 50) - 50) / 10)
      };
    });
  }

  /**
   * Get role-specific stat multipliers
   */
  private static getRoleMultipliers(role: string): {
    rushing: number;
    passing: number;
    catching: number;
    blocking: number;
    tackling: number;
  } {
    const multipliers = {
      RUSHER: { rushing: 3.0, passing: 0.2, catching: 1.0, blocking: 0.5, tackling: 0.3 },
      PASSER: { rushing: 0.5, passing: 3.0, catching: 0.3, blocking: 0.3, tackling: 0.2 },
      BLOCKER: { rushing: 0.3, passing: 0.1, catching: 0.2, blocking: 3.0, tackling: 2.0 }
    };

    return multipliers[role as keyof typeof multipliers] || 
           { rushing: 1.0, passing: 1.0, catching: 1.0, blocking: 1.0, tackling: 1.0 };
  }

  /**
   * Process injury occurrences based on match intensity and camaraderie
   */
  private static async processInjuries(
    players: any[],
    homeEffects: TeamMatchEffects,
    awayEffects: TeamMatchEffects,
    matchIntensity: number
  ): Promise<PlayerInjury[]> {
    const injuries: PlayerInjury[] = [];
    
    for (const player of players.slice(0, 24)) { // Only active players
      const isHomePlayer = player.teamId === players[0]?.teamId;
      const effects = isHomePlayer ? homeEffects : awayEffects;
      
      // Base injury chance affected by intensity and camaraderie
      let injuryChance = (matchIntensity / 100) * 0.15; // 15% max chance in high intensity
      
      // Apply camaraderie injury reduction
      if (effects.camaraderieLevel >= 80) {
        injuryChance *= 0.97; // 3% reduction
      } else if (effects.camaraderieLevel >= 60) {
        injuryChance *= 0.98; // 2% reduction
      } else if (effects.camaraderieLevel >= 40) {
        injuryChance *= 0.99; // 1% reduction
      }

      if (Math.random() < injuryChance) {
        const injuryTypes = ['minor', 'moderate', 'severe'];
        const injuryType = injuryTypes[Math.floor(Math.random() * 3)] as 'minor' | 'moderate' | 'severe';
        
        const affectedStats = ['rushingAttribute', 'passingAttribute', 'catchingAttribute', 'blockingAttribute', 'tacklingAttribute'];
        const affectedStat = affectedStats[Math.floor(Math.random() * affectedStats.length)];
        
        const durations = { minor: 3, moderate: 7, severe: 14 };
        
        injuries.push({
          playerId: player.id.toString(),
          playerName: `${player.firstName} ${player.lastName}`,
          injuryType,
          affectedStat,
          duration: durations[injuryType],
          description: `${injuryType} ${affectedStat.replace('Attribute', '')} injury during match`
        });
      }
    }

    return injuries;
  }

  /**
   * Calculate stamina depletion for all players
   */
  private static async calculateStaminaChanges(
    players: any[],
    avgTacticalEffectiveness: number,
    matchDuration: number
  ): Promise<StaminaUpdate[]> {
    return players.slice(0, 24).map(player => {
      const baseStamina = player.staminaAttribute || 50;
      
      // Tactical effectiveness reduces stamina drain
      const efficiencyFactor = 1 - (avgTacticalEffectiveness / 200);
      const staminaUsed = Math.floor(20 + Math.random() * 30 * efficiencyFactor);
      
      const staminaAfter = Math.max(0, baseStamina - staminaUsed);
      const recoveryTime = Math.max(2, 24 - Math.floor(avgTacticalEffectiveness / 10));

      return {
        playerId: player.id.toString(),
        playerName: `${player.firstName} ${player.lastName}`,
        staminaBefore: baseStamina,
        staminaAfter,
        staminaUsed,
        recoveryTime
      };
    });
  }

  /**
   * Calculate match revenue based on performance and stadium
   */
  private static calculateMatchRevenue(
    homeTeam: any,
    stadiumAtmosphere: number,
    homeScore: number,
    awayScore: number
  ): number {
    const stadium = homeTeam.stadium;
    const baseCapacity = stadium?.capacity || 5000;
    
    // Attendance based on atmosphere and excitement
    const excitement = Math.min(100, (homeScore + awayScore) * 2 + Math.abs(homeScore - awayScore));
    const attendanceRate = Math.min(1.0, (stadiumAtmosphere + excitement) / 150);
    
    const attendance = Math.floor(baseCapacity * attendanceRate);
    const ticketPrice = 15 + Math.floor(stadiumAtmosphere / 10);
    
    return attendance * ticketPrice;
  }

  /**
   * Determine MVP based on player performance
   */
  private static determineMVP(playerStats: PlayerMatchStats[]): string {
    if (!playerStats || playerStats.length === 0) {
      return 'No MVP Selected';
    }

    let bestPlayer = playerStats[0];
    let bestRating = bestPlayer.performanceRating;

    for (const player of playerStats) {
      if (player.performanceRating > bestRating) {
        bestRating = player.performanceRating;
        bestPlayer = player;
      }
    }

    return bestPlayer.playerName;
  }

  /**
   * Generate key match events
   */
  private static generateKeyEvents(
    matchResult: any,
    playerStats: PlayerMatchStats[],
    injuries: PlayerInjury[]
  ): MatchEvent[] {
    const events: MatchEvent[] = [];

    // Add scoring events
    const totalScore = matchResult.homeScore + matchResult.awayScore;
    for (let i = 0; i < totalScore; i++) {
      const minute = Math.floor(Math.random() * matchResult.matchDuration);
      const scorer = playerStats[Math.floor(Math.random() * playerStats.length)];
      
      events.push({
        minute,
        type: 'touchdown',
        description: `${scorer.playerName} scores a touchdown!`,
        playersInvolved: [scorer.playerName]
      });
    }

    // Add injury events
    for (const injury of injuries) {
      events.push({
        minute: Math.floor(Math.random() * matchResult.matchDuration),
        type: 'injury',
        description: `${injury.playerName} sustains a ${injury.injuryType} injury`,
        playersInvolved: [injury.playerName]
      });
    }

    return events.sort((a, b) => a.minute - b.minute);
  }

  /**
   * Generate match summary text
   */
  private static generateMatchSummary(
    homeTeam: any,
    awayTeam: any,
    matchResult: any,
    mvpPlayer: string,
    events: MatchEvent[]
  ): string {
    const homeTeamName = homeTeam.teamName || homeTeam.name || 'Home Team';
    const awayTeamName = awayTeam.teamName || awayTeam.name || 'Away Team';
    
    let summary = `${homeTeamName} ${matchResult.homeScore} - ${matchResult.awayScore} ${awayTeamName}\n\n`;
    
    if (matchResult.homeScore > matchResult.awayScore) {
      summary += `${homeTeamName} dominated with a ${matchResult.homeScore - matchResult.awayScore} point victory. `;
    } else if (matchResult.awayScore > matchResult.homeScore) {
      summary += `${awayTeamName} pulled off an impressive ${matchResult.awayScore - matchResult.homeScore} point road victory. `;
    } else {
      summary += `An exciting draw with both teams showing tremendous determination. `;
    }

    summary += `${mvpPlayer} was named Player of the Match for their outstanding performance.\n\n`;

    if (events.length > 0) {
      summary += `Key moments included ${events.length} major events throughout the ${matchResult.matchDuration} minute contest.`;
    }

    return summary;
  }
}