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
import { 
  calculateTacticalModifiers, 
  determineGameSituation,
  type TeamTacticalInfo,
  type GameState,
  type TacticalModifiers
} from '../../shared/tacticalSystem.js';
import { AdvancedTacticalEffectsService } from './advancedTacticalEffectsService.js';

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
  
  // Core performance metrics
  minutesPlayed: number;
  performanceRating: number;
  camaraderieContribution: number;
  
  // Scoring
  scores: number;
  assists: number;
  
  // Passing in continuous dome ball action
  passAttempts: number;
  passCompletions: number;
  passingYards: number;
  perfectPasses: number;
  
  // Rushing in continuous flow
  rushingYards: number;
  breakawayRuns: number;
  
  // Receiving (all positions can catch)
  catches: number;
  receivingYards: number;
  drops: number;
  
  // Physical defense in continuous action
  tackles: number;
  tackleAttempts: number;
  knockdowns: number;
  blocks: number;
  injuriesInflicted: number;
  
  // Ball disruption
  interceptions: number;
  ballStrips: number;
  passDeflections: number;
  
  // Ball control errors
  fumblesLost: number;
  ballRetention: number;
  
  // Continuous action metrics
  distanceCovered: number;
  staminaUsed: number;
  ballPossessionTime: number;
  pressureApplied: number;
  
  // Physical toll
  injuries: number;
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
  
  // Enhanced tactical system integration
  tacticalModifiers: TacticalModifiers;
  gameSituation: 'winning_big' | 'losing_big' | 'late_close' | 'normal';
  fieldSizeEffects: {
    name: string;
    passRangeModifier: number;
    staminaDepletionModifier: number;
    blockerEngagementModifier: number;
    powerBonusModifier: number;
  };
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

      // 2. Calculate team effects with enhanced tactical system
      // Create initial game state for tactical calculations
      // NOTE: Game situation parameters updated - Late game: final 5min, Close: ≤2pts, Big lead: ≥6pts
      const gameState: GameState = {
        homeScore: 0,
        awayScore: 0,
        gameTime: 0,
        maxTime: 1200, // 20 minutes default (will be updated based on match type)
        currentHalf: 1
      };

      const homeEffects = await this.calculateTeamEffects(match.homeTeam, gameState, true);
      const awayEffects = await this.calculateTeamEffects(match.awayTeam, gameState, false);

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

      // 6. Calculate enhanced stamina depletion with tactical modifiers
      const staminaChanges = await this.calculateStaminaChanges(
        [...match.homeTeam.players, ...match.awayTeam.players],
        homeEffects.tacticalEffectiveness + awayEffects.tacticalEffectiveness,
        matchResult.matchDuration,
        {
          homeStaminaModifier: homeEffects.tacticalModifiers.staminaDepletionModifier,
          awayStaminaModifier: awayEffects.tacticalModifiers.staminaDepletionModifier,
          homeTeamSize: match.homeTeam.players.length,
          awayTeamSize: match.awayTeam.players.length
        }
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

      // 11. Save comprehensive statistics to database
      await this.saveMatchStatistics(match, playerStats, homeEffects, awayEffects, matchResult);

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
        mvp: mvpPlayer,
        statisticsSaved: true
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
  private static async calculateTeamEffects(team: any, gameState: GameState, isHomeTeam: boolean): Promise<TeamMatchEffects> {
    // Get camaraderie effects
    const camaraderieEffects = await CamaraderieService.getCamaraderieEffects(team.id.toString());
    
    // Get coaching bonus from head coach
    const headCoach = team.staff.find((s: any) => s.type === 'HEAD_COACH');
    const coachingBonus = headCoach ? (headCoach.tactics || DEFAULT_STAT_VALUE) * 0.5 : 0;
    
    // 🚀 ENHANCED TACTICAL SYSTEM INTEGRATION
    const teamTacticalInfo: TeamTacticalInfo = {
      fieldSize: (team.homeField || 'STANDARD').toLowerCase() as any,
      tacticalFocus: (team.tacticalFocus || 'BALANCED') as any,
      camaraderie: camaraderieEffects.teamCamaraderie,
      headCoachTactics: headCoach?.tactics || DEFAULT_STAT_VALUE,
      isHomeTeam
    };

    // Calculate sophisticated tactical modifiers
    const tacticalModifiers = calculateTacticalModifiers(teamTacticalInfo, gameState, isHomeTeam);
    const gameSituation = determineGameSituation(gameState);
    
    // Get field size effects for display/logging
    const fieldSizeEffects = {
      name: isHomeTeam ? `${team.homeField || 'STANDARD'} Field` : 'Standard Field (Away)',
      passRangeModifier: tacticalModifiers.passRangeModifier,
      staminaDepletionModifier: tacticalModifiers.staminaDepletionModifier,
      blockerEngagementModifier: tacticalModifiers.blockerRangeModifier,
      powerBonusModifier: tacticalModifiers.powerBonusModifier
    };

    // Calculate overall tactical effectiveness from modifiers
    const tacticalEffectiveness = Math.min(100, 
      // Base effectiveness from modifiers
      (tacticalModifiers.passRangeModifier * 25) +
      (tacticalModifiers.runnerRouteDepthModifier * 20) +
      (tacticalModifiers.blockerAggressionModifier * 20) +
      (tacticalModifiers.clutchPerformanceModifier || 1.0) * 20 +
      // Coach and camaraderie bonus
      (headCoach?.tactics || DEFAULT_STAT_VALUE) * 0.15
    );

    // 🎯 TACTICAL SYSTEM LOGGING
    console.log(`🎯 [TACTICS] ${isHomeTeam ? 'HOME' : 'AWAY'} Team: ${team.name}`);
    console.log(`   Field Size: ${teamTacticalInfo.fieldSize.toUpperCase()} (${fieldSizeEffects.name})`);
    console.log(`   Tactical Focus: ${teamTacticalInfo.tacticalFocus}`);
    console.log(`   Game Situation: ${gameSituation}`);
    console.log(`   Pass Range Modifier: ${tacticalModifiers.passRangeModifier}x`);
    console.log(`   Stamina Depletion: ${tacticalModifiers.staminaDepletionModifier}x`);
    console.log(`   Blocker Aggression: ${tacticalModifiers.blockerAggressionModifier}x`);
    console.log(`   Power Bonus: +${tacticalModifiers.powerBonusModifier}`);
    console.log(`   Coach Tactics: ${headCoach?.tactics || DEFAULT_STAT_VALUE}`);
    console.log(`   Final Effectiveness: ${tacticalEffectiveness.toFixed(1)}%\n`);

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
      raceEffectBonuses,
      
      // Enhanced tactical system data
      tacticalModifiers,
      gameSituation,
      fieldSizeEffects
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

    // 🚀 ENHANCED TACTICAL MODIFIERS APPLICATION
    // Apply comprehensive tactical system modifiers
    const homeModifiedStrength = homeStrength * 
      // Traditional modifiers
      (1 + homeEffects.tacticalEffectiveness / 100) *
      (1 + homeEffects.coachingBonus / 100) *
      (1 + homeEffects.stadiumAtmosphere / 200) * // Home field advantage
      (1 + homeEffects.equipmentBonuses / 100) *
      (1 + homeEffects.raceEffectBonuses / 100) *
      (1 + (homeEffects.camaraderieBonus.catching + homeEffects.camaraderieBonus.agility) / 200) *
      
      // 🎯 NEW: Field size tactical modifiers
      homeEffects.tacticalModifiers.passRangeModifier *
      homeEffects.tacticalModifiers.blockerAggressionModifier *
      
      // 🎯 NEW: Tactical focus modifiers
      homeEffects.tacticalModifiers.runnerRouteDepthModifier *
      homeEffects.tacticalModifiers.passerRiskToleranceModifier *
      
      // 🎯 NEW: Situational modifiers
      (homeEffects.tacticalModifiers.clutchPerformanceModifier || 1.0) *
      (homeEffects.tacticalModifiers.conservativePlayModifier || 1.0) *
      (homeEffects.tacticalModifiers.desperationModifier || 1.0);

    const awayModifiedStrength = awayStrength * 
      // Traditional modifiers (no stadium advantage for away team)
      (1 + awayEffects.tacticalEffectiveness / 100) *
      (1 + awayEffects.coachingBonus / 100) *
      (1 + awayEffects.equipmentBonuses / 100) *
      (1 + awayEffects.raceEffectBonuses / 100) *
      (1 + (awayEffects.camaraderieBonus.catching + awayEffects.camaraderieBonus.agility) / 200) *
      
      // 🎯 NEW: Away team tactical modifiers (no field size benefits)
      awayEffects.tacticalModifiers.blockerAggressionModifier *
      awayEffects.tacticalModifiers.runnerRouteDepthModifier *
      awayEffects.tacticalModifiers.passerRiskToleranceModifier *
      
      // 🎯 NEW: Situational modifiers
      (awayEffects.tacticalModifiers.clutchPerformanceModifier || 1.0) *
      (awayEffects.tacticalModifiers.conservativePlayModifier || 1.0) *
      (awayEffects.tacticalModifiers.desperationModifier || 1.0);

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
      
      // Generate realistic dome ball statistics based on continuous action
      const baseIntensity = matchResult.intensity / 100;
      const playerIntensity = effectMultiplier * baseIntensity;
      
      // Core physical metrics
      const minutesPlayed = 45 + Math.floor(Math.random() * 15); // 45-60 minutes in continuous action
      const staminaUsed = Math.floor(minutesPlayed * 0.6 + Math.random() * 20); // Stamina correlates with time played
      const distanceCovered = Math.floor(minutesPlayed * (20 + Math.random() * 15)); // Yards covered during continuous play
      
      // Scoring metrics
      const scores = Math.floor(Math.random() * 3 * roleMultipliers.scoring * playerIntensity); // 0-2 scores typical
      const assists = Math.floor(Math.random() * 2 * roleMultipliers.playmaking * playerIntensity);
      
      // Passing in continuous action
      const passAttempts = Math.floor((player.passingAttribute || 20) * roleMultipliers.passing * playerIntensity * 0.2);
      const passCompletions = Math.floor(passAttempts * (0.6 + Math.random() * 0.3)); // 60-90% completion rate
      const passingYards = Math.floor(passCompletions * (8 + Math.random() * 12)); // 8-20 yards per completion
      const perfectPasses = Math.floor(passCompletions * (0.1 + Math.random() * 0.2)); // 10-30% perfect passes
      
      // Rushing in continuous flow
      const rushingYards = Math.floor((player.rushingAttribute || 20) * roleMultipliers.rushing * playerIntensity * 0.3);
      const breakawayRuns = rushingYards > 50 ? Math.floor(rushingYards / 50) : 0; // Long runs of 15+ yards
      
      // Receiving (all positions can catch in dome ball)
      const catches = Math.floor((player.catchingAttribute || 20) * roleMultipliers.receiving * playerIntensity * 0.15);
      const receivingYards = Math.floor(catches * (6 + Math.random() * 10)); // 6-16 yards per catch
      const drops = Math.floor(Math.random() * 2 * (1 - playerIntensity)); // Better players drop less
      
      // Physical defense in continuous action
      const tackleAttempts = Math.floor((player.tacklingAttribute || 20) * roleMultipliers.tackling * playerIntensity * 0.2);
      const tackles = Math.floor(tackleAttempts * (0.7 + Math.random() * 0.2)); // 70-90% success rate
      const knockdowns = Math.floor(tackles * (0.3 + Math.random() * 0.2)); // 30-50% of tackles result in knockdowns
      const blocks = Math.floor((player.blockingAttribute || 20) * roleMultipliers.blocking * playerIntensity * 0.1);
      const injuriesInflicted = Math.floor(Math.random() * 1 * baseIntensity); // Rare but possible
      
      // Ball disruption
      const interceptions = Math.floor(Math.random() * 1 * roleMultipliers.ballHawking * playerIntensity);
      const ballStrips = Math.floor(Math.random() * 1 * roleMultipliers.tackling * playerIntensity);
      const passDeflections = Math.floor(tackleAttempts * 0.2 * roleMultipliers.coverage);
      
      // Ball control errors
      const fumblesLost = Math.floor(Math.random() * 2 * (1 - playerIntensity + (player.effects.camaraderieBonus.fumbleRisk || 0)));
      const ballRetention = Math.floor(Math.random() * 3 * playerIntensity); // Good ball security plays
      
      // Continuous action metrics
      const ballPossessionTime = Math.floor(Math.random() * 120 * roleMultipliers.ballHandling); // Seconds holding ball
      const pressureApplied = Math.floor(tackleAttempts * 0.5); // Times pressured opposing ball carrier
      
      // Physical toll
      const injuries = Math.floor(Math.random() * 1 * baseIntensity * (1 - (player.effects.camaraderieLevel / 100))); // Injuries rare, camaraderie helps
      
      // Calculate comprehensive performance rating (0-100)
      const offensiveScore = (scores * 10) + (assists * 5) + (passingYards * 0.1) + (rushingYards * 0.15) + (receivingYards * 0.15);
      const defensiveScore = (tackles * 2) + (knockdowns * 3) + (interceptions * 8) + (ballStrips * 5);
      const performanceRating = Math.min(100, Math.max(0, 
        (offensiveScore + defensiveScore) * 0.5 + 
        (player.effects.camaraderieLevel - 50) * 0.3 +
        (50 * playerIntensity)
      ));
      
      // Camaraderie contribution (-5 to +5)
      const camaraderieContribution = Math.max(-5, Math.min(5, 
        ((player.camaraderieScore || 50) - 50) / 10 + 
        (performanceRating - 50) / 25
      ));

      return {
        playerId: player.id.toString(),
        playerName: `${player.firstName} ${player.lastName}`,
        role: player.role,
        
        // Core performance metrics
        minutesPlayed,
        performanceRating: Math.round(performanceRating),
        camaraderieContribution: Math.round(camaraderieContribution * 10) / 10,
        
        // Scoring
        scores,
        assists,
        
        // Passing in continuous dome ball action
        passAttempts,
        passCompletions,
        passingYards,
        perfectPasses,
        
        // Rushing in continuous flow
        rushingYards,
        breakawayRuns,
        
        // Receiving (all positions can catch)
        catches,
        receivingYards,
        drops,
        
        // Physical defense in continuous action
        tackles,
        tackleAttempts,
        knockdowns,
        blocks,
        injuriesInflicted,
        
        // Ball disruption
        interceptions,
        ballStrips,
        passDeflections,
        
        // Ball control errors
        fumblesLost,
        ballRetention,
        
        // Continuous action metrics
        distanceCovered,
        staminaUsed,
        ballPossessionTime,
        pressureApplied,
        
        // Physical toll
        injuries
      };
    });
  }

  /**
   * Get role-specific stat multipliers for dome ball continuous action
   */
  private static getRoleMultipliers(role: string): {
    // Offensive
    scoring: number;
    playmaking: number;
    passing: number;
    rushing: number;
    receiving: number;
    
    // Defensive
    tackling: number;
    blocking: number;
    ballHawking: number;
    coverage: number;
    
    // Utility
    ballHandling: number;
  } {
    const multipliers = {
      Runner: { 
        scoring: 2.0, playmaking: 1.2, passing: 0.3, rushing: 3.0, receiving: 1.5,
        tackling: 0.8, blocking: 0.5, ballHawking: 0.7, coverage: 0.6,
        ballHandling: 2.5 
      },
      Passer: { 
        scoring: 1.5, playmaking: 3.0, passing: 3.0, rushing: 0.4, receiving: 0.8,
        tackling: 0.3, blocking: 0.2, ballHawking: 1.2, coverage: 1.0,
        ballHandling: 2.0 
      },
      Blocker: { 
        scoring: 0.8, playmaking: 0.5, passing: 0.2, rushing: 0.6, receiving: 0.4,
        tackling: 2.5, blocking: 3.0, ballHawking: 0.8, coverage: 1.8,
        ballHandling: 0.5 
      }
    };

    // Handle legacy role names and normalize
    const normalizedRole = role === 'RUSHER' ? 'Runner' : 
                          role === 'PASSER' ? 'Passer' : 
                          role === 'BLOCKER' ? 'Blocker' : role;

    return multipliers[normalizedRole as keyof typeof multipliers] || 
           { 
             scoring: 1.0, playmaking: 1.0, passing: 1.0, rushing: 1.0, receiving: 1.0,
             tackling: 1.0, blocking: 1.0, ballHawking: 1.0, coverage: 1.0,
             ballHandling: 1.0 
           };
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
   * Calculate stamina depletion for all players with tactical modifiers
   */
  private static async calculateStaminaChanges(
    players: any[],
    avgTacticalEffectiveness: number,
    matchDuration: number,
    tacticalData?: {
      homeStaminaModifier: number;
      awayStaminaModifier: number;
      homeTeamSize: number;
      awayTeamSize: number;
    }
  ): Promise<StaminaUpdate[]> {
    return players.slice(0, 24).map((player, index) => {
      const baseStamina = player.staminaAttribute || 50;
      
      // 🚀 ENHANCED: Apply tactical field size stamina modifiers
      let tacticalStaminaModifier = 1.0;
      if (tacticalData) {
        // Determine if this player is home or away team
        const isHomeTeamPlayer = index < tacticalData.homeTeamSize;
        tacticalStaminaModifier = isHomeTeamPlayer ? 
          tacticalData.homeStaminaModifier : 
          tacticalData.awayStaminaModifier;
      }
      
      // Tactical effectiveness reduces stamina drain
      const efficiencyFactor = 1 - (avgTacticalEffectiveness / 200);
      
      // Apply field size effects to stamina usage
      const baseStaminaUsed = 20 + Math.random() * 30;
      const staminaUsed = Math.floor(baseStaminaUsed * efficiencyFactor * tacticalStaminaModifier);
      
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

  /**
   * Save comprehensive match statistics to database
   */
  private static async saveMatchStatistics(
    match: any, 
    playerStats: PlayerMatchStats[], 
    homeEffects: TeamMatchEffects, 
    awayEffects: TeamMatchEffects, 
    matchResult: any
  ): Promise<void> {
    try {
      const prisma = await getPrismaClient();
      const matchDate = new Date();

      logInfo("Saving match statistics to database", { 
        matchId: match.id, 
        playerCount: playerStats.length,
        matchType: match.matchType 
      });

      // Only save statistics for meaningful matches (not exhibitions)
      const meaningfulMatch = ['LEAGUE', 'PLAYOFF'].includes(match.matchType);
      
      if (!meaningfulMatch) {
        logInfo("Skipping statistics save for exhibition match", { matchType: match.matchType });
        return;
      }

      // Save individual player statistics
      for (const playerStat of playerStats) {
        await prisma.playerMatchStats.create({
          data: {
            playerId: parseInt(playerStat.playerId),
            gameId: match.id,
            matchDate: matchDate,
            matchType: match.matchType,
            
            // Core performance metrics
            minutesPlayed: playerStat.minutesPlayed,
            performanceRating: playerStat.performanceRating,
            camaraderieContribution: playerStat.camaraderieContribution,
            
            // Scoring
            scores: playerStat.scores,
            assists: playerStat.assists,
            
            // Passing in continuous dome ball action
            passAttempts: playerStat.passAttempts,
            passCompletions: playerStat.passCompletions,
            passingYards: playerStat.passingYards,
            perfectPasses: playerStat.perfectPasses,
            
            // Rushing in continuous flow
            rushingYards: playerStat.rushingYards,
            breakawayRuns: playerStat.breakawayRuns,
            
            // Receiving (all positions can catch)
            catches: playerStat.catches,
            receivingYards: playerStat.receivingYards,
            drops: playerStat.drops,
            
            // Physical defense in continuous action
            tackles: playerStat.tackles,
            tackleAttempts: playerStat.tackleAttempts,
            knockdowns: playerStat.knockdowns,
            blocks: playerStat.blocks,
            injuriesInflicted: playerStat.injuriesInflicted,
            
            // Ball disruption
            interceptions: playerStat.interceptions,
            ballStrips: playerStat.ballStrips,
            passDeflections: playerStat.passDeflections,
            
            // Ball control errors
            fumblesLost: playerStat.fumblesLost,
            ballRetention: playerStat.ballRetention,
            
            // Continuous action metrics
            distanceCovered: playerStat.distanceCovered,
            staminaUsed: playerStat.staminaUsed,
            ballPossessionTime: playerStat.ballPossessionTime,
            pressureApplied: playerStat.pressureApplied,
            
            // Physical toll
            injuries: playerStat.injuries
          }
        });
      }

      // Calculate and save team statistics
      await this.saveTeamStatistics(match.homeTeamId, match.id, playerStats, homeEffects, matchResult, true, matchDate, match.matchType);
      await this.saveTeamStatistics(match.awayTeamId, match.id, playerStats, awayEffects, matchResult, false, matchDate, match.matchType);

      logInfo("Successfully saved all match statistics", { 
        matchId: match.id,
        playerStatsCount: playerStats.length,
        teamStatsCount: 2
      });
      
    } catch (error) {
      logError(error as Error, undefined, { operation: 'saveMatchStatistics', matchId: match.id });
      // Don't throw - we don't want to fail the entire match simulation if stats saving fails
    }
  }

  /**
   * Save team-level statistics aggregated from player stats
   */
  private static async saveTeamStatistics(
    teamId: number, 
    gameId: number, 
    playerStats: PlayerMatchStats[], 
    teamEffects: TeamMatchEffects,
    matchResult: any,
    isHomeTeam: boolean,
    matchDate: Date,
    matchType: string
  ): Promise<void> {
    const prisma = await getPrismaClient();

    // Filter player stats for this team
    const teamPlayerStats = playerStats.filter(stat => {
      // Determine team membership by checking which half of stats this player is in
      const playerIndex = playerStats.findIndex(p => p.playerId === stat.playerId);
      const isHomePlayer = playerIndex < (playerStats.length / 2);
      return isHomePlayer === isHomeTeam;
    });

    if (teamPlayerStats.length === 0) {
      logError(new Error('No player stats found for team'), undefined, { teamId, gameId });
      return;
    }

    // Aggregate team statistics from player stats
    const aggregated = teamPlayerStats.reduce((acc, stat) => ({
      totalScore: acc.totalScore + stat.scores,
      totalPassingYards: acc.totalPassingYards + stat.passingYards,
      totalRushingYards: acc.totalRushingYards + stat.rushingYards,
      totalTackles: acc.totalTackles + stat.tackles,
      totalKnockdowns: acc.totalKnockdowns + stat.knockdowns,
      totalBlocks: acc.totalBlocks + stat.blocks,
      totalInjuriesInflicted: acc.totalInjuriesInflicted + stat.injuriesInflicted,
      totalInterceptions: acc.totalInterceptions + stat.interceptions,
      totalBallStrips: acc.totalBallStrips + stat.ballStrips,
      passDeflections: acc.passDeflections + stat.passDeflections,
      totalFumbles: acc.totalFumbles + stat.fumblesLost,
      totalPassAttempts: acc.totalPassAttempts + stat.passAttempts,
      totalPassCompletions: acc.totalPassCompletions + stat.passCompletions,
      totalBallPossessionTime: acc.totalBallPossessionTime + stat.ballPossessionTime,
      totalDistanceCovered: acc.totalDistanceCovered + stat.distanceCovered,
    }), {
      totalScore: 0, totalPassingYards: 0, totalRushingYards: 0, totalTackles: 0,
      totalKnockdowns: 0, totalBlocks: 0, totalInjuriesInflicted: 0, totalInterceptions: 0,
      totalBallStrips: 0, passDeflections: 0, totalFumbles: 0, totalPassAttempts: 0,
      totalPassCompletions: 0, totalBallPossessionTime: 0, totalDistanceCovered: 0
    });

    // Calculate derived statistics
    const totalOffensiveYards = aggregated.totalPassingYards + aggregated.totalRushingYards;
    const passingAccuracy = aggregated.totalPassAttempts > 0 ? 
      (aggregated.totalPassCompletions / aggregated.totalPassAttempts) * 100 : 0;
    const ballRetentionRate = teamPlayerStats.length > 0 ? 
      Math.max(0, 100 - (aggregated.totalFumbles / teamPlayerStats.length) * 10) : 50;
    
    // Use match result data
    const teamScore = isHomeTeam ? matchResult.homeScore : matchResult.awayScore;
    const opponentScore = isHomeTeam ? matchResult.awayScore : matchResult.homeScore;
    const scoringEfficiency = aggregated.totalScore > 0 ? (teamScore / Math.max(aggregated.totalScore, 1)) * 100 : 0;
    
    // Calculate possession and territory estimates
    const estimatedPossessionTime = Math.floor(matchResult.matchDuration * 30 + Math.random() * 600); // 30-40 minutes estimated
    const possessionPercentage = Math.min(100, Math.max(0, 50 + (teamScore - opponentScore) * 2));
    const averageFieldPosition = 50 + Math.random() * 20 - 10; // 40-60 yard line average
    
    await prisma.teamMatchStats.create({
      data: {
        teamId: teamId,
        gameId: gameId,
        matchDate: matchDate,
        matchType: matchType,
        
        // Possession & Territory Control
        timeOfPossession: estimatedPossessionTime,
        possessionPercentage: Math.round(possessionPercentage * 10) / 10,
        averageFieldPosition: Math.round(averageFieldPosition * 10) / 10,
        territoryGained: totalOffensiveYards,
        
        // Offensive Flow
        totalScore: teamScore,
        totalPassingYards: aggregated.totalPassingYards,
        totalRushingYards: aggregated.totalRushingYards,
        totalOffensiveYards: totalOffensiveYards,
        passingAccuracy: Math.round(passingAccuracy * 10) / 10,
        ballRetentionRate: Math.round(ballRetentionRate * 10) / 10,
        scoringOpportunities: Math.max(1, Math.floor(totalOffensiveYards / 50)), // Rough estimate
        scoringEfficiency: Math.round(scoringEfficiency * 10) / 10,
        
        // Physical Defense
        totalTackles: aggregated.totalTackles,
        totalKnockdowns: aggregated.totalKnockdowns,
        totalBlocks: aggregated.totalBlocks,
        totalInjuriesInflicted: aggregated.totalInjuriesInflicted,
        
        // Ball Disruption
        totalInterceptions: aggregated.totalInterceptions,
        totalBallStrips: aggregated.totalBallStrips,
        passDeflections: aggregated.passDeflections,
        defensiveStops: aggregated.totalInterceptions + aggregated.totalBallStrips,
        
        // Physical & Flow Metrics
        totalFumbles: aggregated.totalFumbles,
        turnoverDifferential: aggregated.totalInterceptions + aggregated.totalBallStrips - aggregated.totalFumbles,
        physicalDominance: aggregated.totalKnockdowns - aggregated.totalFumbles,
        ballSecurityRating: ballRetentionRate,
        
        // Environment & Strategy Effects
        homeFieldAdvantage: isHomeTeam ? teamEffects.stadiumAtmosphere / 10 : 0,
        crowdIntensity: teamEffects.stadiumAtmosphere,
        domeReverberation: isHomeTeam ? teamEffects.stadiumAtmosphere * 0.8 : teamEffects.stadiumAtmosphere * 0.3,
        camaraderieTeamBonus: teamEffects.camaraderieLevel,
        tacticalEffectiveness: teamEffects.tacticalEffectiveness,
        equipmentAdvantage: teamEffects.equipmentBonuses,
        physicalConditioning: Math.max(0, 100 - (aggregated.totalDistanceCovered / teamPlayerStats.length / 10))
      }
    });
  }
}