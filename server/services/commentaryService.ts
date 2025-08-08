/**
 * Comprehensive Commentary Service
 * Implements 200+ specific commentary prompts for dynamic, engaging match simulation
 */

import { fantasyCommentaryDatabase } from './fantasyCommentaryDatabase.js';
import { configManager } from '../utils/configManager.js';

interface Player {
  id: string;
  firstName: string | null;
  lastName: string | null;
  tacticalRole: string | null;
  race?: string | null;
  speed: number | null;
  power: number | null;
  throwing: number | null;
  catching: number | null;
  kicking: number | null;
  stamina: number | null;
  agility: number | null;
  leadership: number | null;
  [key: string]: any; // Allow additional properties from database
}

interface Team {
  id: string;
  name: string;
  power?: number;
}

interface CommentaryContext {
  gameTime: number;
  maxTime: number;
  currentHalf: number;
  homeScore: number;
  awayScore: number;
  gamePhase: 'early' | 'middle' | 'late' | 'clutch';
  momentum: { home: number; away: number };
  intimidationFactor?: number;
  teamCamaraderie?: { home: number; away: number };
}

export class CommentaryService {
  private commentaryConfig = {}; // Commentary config not yet implemented
  
  // Helper Methods
  /**
   * Weighted Commentary Selection using Softmax Distribution
   * Replaces fixed percentage chances with dynamic weighting
   */
  private selectWeightedCommentary(commentaryOptions: Array<{
    prompts: string[];
    weight: number;
    context: string;
  }>): string {
    // Calculate softmax probabilities
    const maxWeight = Math.max(...commentaryOptions.map(opt => opt.weight));
    const exponentials = commentaryOptions.map(opt => Math.exp(opt.weight - maxWeight));
    const sumExponentials = exponentials.reduce((sum, exp) => sum + exp, 0);
    
    const probabilities = exponentials.map(exp => exp / sumExponentials);
    
    // Generate random number for selection
    const random = Math.random();
    let cumulativeProbability = 0;
    
    for (let i = 0; i < commentaryOptions.length; i++) {
      cumulativeProbability += probabilities[i];
      if (random <= cumulativeProbability) {
        const selectedOption = commentaryOptions[i];
        return selectedOption.prompts[Math.floor(Math.random() * selectedOption.prompts.length)];
      }
    }
    
    // Fallback to first option
    const fallbackOption = commentaryOptions[0];
    return fallbackOption.prompts[Math.floor(Math.random() * fallbackOption.prompts.length)];
  }

  private getPlayerDisplayName(player: Player): string {
    const firstName = player.firstName || '';
    const lastName = player.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    // Debug logging to help identify issues
    if (!fullName || fullName === '') {
      console.log('WARNING: Player missing name data:', player);
      return 'Unknown Player';
    }
    
    return fullName;
  }

  private getTeamPowerTier(team: Team): string {
    const power = team.power || 0;
    if (power >= 35) return "Elite";
    if (power >= 28) return "Contender";
    if (power >= 21) return "Competitive";
    if (power >= 14) return "Developing";
    return "Foundation";
  }

  private determineGamePhase(context: CommentaryContext): string {
    const timePercent = context.gameTime / context.maxTime;
    if (timePercent < 0.25) return "early";
    if (timePercent < 0.75) return "middle";
    if (timePercent < 0.9) return "late";
    return "clutch";
  }


  private generatePassCommentaryFromDatabase(event: any, playerName: string, race: string, gamePhase: string, context: CommentaryContext): string {
    const yards = event.yardsGained || 0;
    const receiverName = event.receiverName || 'the receiver';
    const tacklerName = event.tacklerName || 'the defense';
    
    let commentary: string[];
    
    // Choose appropriate commentary based on pass type
    if (yards >= 20) {
      commentary = [...fantasyCommentaryDatabase.deepPasses];
    } else if (event.skillUsed) {
      commentary = [...fantasyCommentaryDatabase.skillBasedPasses];
    } else {
      commentary = [...fantasyCommentaryDatabase.standardCompletions];
    }
    
    // Use weighted selection instead of fixed percentage
    const weights = (this.commentaryConfig as any).prompt_weights;
    const commentaryOptions = [
      {
        prompts: commentary,
        weight: weights.neutral,
        context: 'neutral'
      }
    ];
    
    // Add race-specific commentary option
    if (race === 'LUMINA' && fantasyCommentaryDatabase.raceBasedPasses?.LUMINA) {
      commentaryOptions.push({
        prompts: fantasyCommentaryDatabase.raceBasedPasses.LUMINA,
        weight: weights.race_flavor,
        context: 'race_flavor'
      });
    }
    
    // Add contextual commentary for late game
    if (gamePhase === 'clutch') {
      commentaryOptions.push({
        prompts: [
          `Under pressure in crunch time, ${playerName} delivers to ${receiverName}!`,
          `When it matters most, ${playerName} comes through for ${yards} yards!`
        ],
        weight: weights.late_game,
        context: 'late_game'
      });
    }
    
    const selectedCommentary = this.selectWeightedCommentary(commentaryOptions);
    
    return selectedCommentary
      .replace(/{passerName}/g, playerName)
      .replace(/{receiverName}/g, receiverName)
      .replace(/{tacklerName}/g, tacklerName)
      .replace(/{yards}/g, yards.toString());
  }

  private generateRunCommentaryFromDatabase(event: any, playerName: string, race: string, gamePhase: string, context: CommentaryContext): string {
    const yards = event.yardsGained || 0;
    const tacklerName = event.tacklerName || 'the defense';
    
    let commentary: string[];
    
    // Choose appropriate commentary based on run type
    if (yards >= 12) {
      commentary = [...fantasyCommentaryDatabase.breakawayRuns];
    } else if (event.skillUsed) {
      commentary = [...fantasyCommentaryDatabase.skillBasedRuns];
    } else {
      commentary = [...fantasyCommentaryDatabase.standardRuns];
    }
    
    // Add race-specific commentary (15% chance for uniqueness)
    if (fantasyCommentaryDatabase.raceBasedRuns[race] && Math.random() < 0.15) {
      commentary.push(...fantasyCommentaryDatabase.raceBasedRuns[race]);
    }
    
    // Add clutch commentary in late game
    if (gamePhase === 'clutch') {
      commentary.push(`In crunch time, ${playerName} delivers with a crucial ${yards}-yard run!`);
      commentary.push(`When the pressure is on, ${playerName} finds a way for ${yards} yards!`);
    }
    
    const selectedCommentary = commentary[Math.floor(Math.random() * commentary.length)];
    return selectedCommentary
      .replace(/{runnerName}/g, playerName)
      .replace(/{tacklerName}/g, tacklerName)
      .replace(/{yards}/g, yards.toString());
  }

  private generateScoreCommentaryFromDatabase(event: any, playerName: string, race: string, gamePhase: string, context: CommentaryContext): string {
    const teamName = event.teamName || 'the team';
    const passerName = event.passerName || playerName;
    const receiverName = event.receiverName || playerName;
    
    let commentary = [...fantasyCommentaryDatabase.scoring];
    
    // Add race-specific scoring commentary (15% chance for uniqueness)
    if (race === 'LUMINA' && Math.random() < 0.15) {
      commentary.push(`SCORE! ${playerName}'s radiant power illuminates the end zone for ${teamName}!`);
    } else if (race === 'GRYLL' && Math.random() < 0.15) {
      commentary.push(`SCORE! ${playerName} powers through with Gryll determination for ${teamName}!`);
    } else if (race === 'SYLVAN' && Math.random() < 0.15) {
      commentary.push(`SCORE! ${playerName} dances into the end zone with Sylvan grace for ${teamName}!`);
    } else if (race === 'UMBRA' && Math.random() < 0.15) {
      commentary.push(`SCORE! ${playerName} slips into the shadows of the end zone for ${teamName}!`);
    }
    
    // Add clutch commentary in late game
    if (gamePhase === 'clutch') {
      commentary.push(`CLUTCH SCORE! ${playerName} delivers when it matters most for ${teamName}!`);
      commentary.push(`IN THE CLUTCH! ${playerName} rises to the occasion for ${teamName}!`);
    }
    
    const selectedCommentary = commentary[Math.floor(Math.random() * commentary.length)];
    return selectedCommentary
      .replace(/{playerName}/g, playerName)
      .replace(/{teamName}/g, teamName)
      .replace(/{passerName}/g, passerName)
      .replace(/{receiverName}/g, receiverName);
  }

  private generateInterceptionCommentaryFromDatabase(event: any, playerName: string, race: string, gamePhase: string, context: CommentaryContext): string {
    const defenderName = event.defenderName || playerName;
    const receiverName = event.receiverName || 'the receiver';
    
    let commentary = [...fantasyCommentaryDatabase.interceptions];
    
    // Add clutch commentary in late game
    if (gamePhase === 'clutch') {
      commentary.push(`CLUTCH INTERCEPTION! ${playerName} reads the situation perfectly in crunch time!`);
      commentary.push(`When it matters most, ${playerName} comes up with the big defensive play!`);
    }
    
    const selectedCommentary = commentary[Math.floor(Math.random() * commentary.length)];
    return selectedCommentary
      .replace(/{defenderName}/g, defenderName)
      .replace(/{receiverName}/g, receiverName)
      .replace(/{playerName}/g, playerName);
  }

  private generateTackleCommentaryFromDatabase(event: any, playerName: string, race: string, gamePhase: string, context: CommentaryContext): string {
    const tacklerName = event.tacklerName || playerName;
    const carrierName = event.carrierName || 'the runner';
    const isPowerTackle = event.isPowerTackle || (event.power && event.power >= 30);
    
    let commentary: string[];
    
    // Choose appropriate commentary based on tackle type
    if (isPowerTackle) {
      commentary = [...fantasyCommentaryDatabase.highPowerTackles];
      
      // Add "Anything Goes" commentary for brutal hits (10% chance)
      if (Math.random() < 0.1) {
        commentary.push(...fantasyCommentaryDatabase.anythingGoes);
      }
    } else {
      commentary = [...fantasyCommentaryDatabase.standardTackles];
    }
    
    // Add clutch commentary in late game
    if (gamePhase === 'clutch') {
      commentary.push(`CLUTCH TACKLE! ${playerName} makes the crucial stop when it matters most!`);
      commentary.push(`In crunch time, ${playerName} delivers the big defensive play!`);
    }
    
    const selectedCommentary = commentary[Math.floor(Math.random() * commentary.length)];
    return selectedCommentary
      .replace(/{tacklerName}/g, tacklerName)
      .replace(/{carrierName}/g, carrierName)
      .replace(/{defenderName}/g, tacklerName)
      .replace(/{playerName}/g, playerName)
      .replace(/{blockerName}/g, tacklerName)
      .replace(/{opponentName}/g, carrierName);
  }

  private generateContestedBallCommentaryFromDatabase(event: any, playerName: string, race: string, gamePhase: string, context: CommentaryContext): string {
    const isForced = event.isForced || false;
    const tacklerName = event.tacklerName || playerName;
    const carrierName = event.carrierName || 'the carrier';
    const receiverName = event.receiverName || 'the receiver';
    const teamName = event.teamName || 'the team';
    
    let commentary: string[];
    
    // Choose appropriate commentary based on contest type
    if (isForced) {
      commentary = [...fantasyCommentaryDatabase.contestedBallForced];
    } else {
      commentary = [...fantasyCommentaryDatabase.contestedBallUnforced];
    }
    
    // Add recovery commentary
    commentary.push(...fantasyCommentaryDatabase.contestedBallScramble);
    
    const selectedCommentary = commentary[Math.floor(Math.random() * commentary.length)];
    return selectedCommentary
      .replace(/{tacklerName}/g, tacklerName)
      .replace(/{carrierName}/g, carrierName)
      .replace(/{receiverName}/g, receiverName)
      .replace(/{playerName}/g, playerName)
      .replace(/{teamName}/g, teamName);
  }

  private generatePossessionBattleCommentaryFromDatabase(event: any, playerName: string, race: string, gamePhase: string, context: CommentaryContext): string {
    const teamName = event.teamName || 'the team';
    
    const commentary = [...fantasyCommentaryDatabase.possessionBattle];
    
    const selectedCommentary = commentary[Math.floor(Math.random() * commentary.length)];
    return selectedCommentary
      .replace(/{teamName}/g, teamName)
      .replace(/{playerName}/g, playerName);
  }

  private generateAnythingGoesCommentaryFromDatabase(event: any, playerName: string, race: string, gamePhase: string, context: CommentaryContext): string {
    const blockerName = event.blockerName || playerName;
    const opponentName = event.opponentName || 'the opponent';
    const tacklerName = event.tacklerName || playerName;
    
    const commentary = [...fantasyCommentaryDatabase.anythingGoes];
    
    const selectedCommentary = commentary[Math.floor(Math.random() * commentary.length)];
    return selectedCommentary
      .replace(/{blockerName}/g, blockerName)
      .replace(/{playerName}/g, playerName)
      .replace(/{opponentName}/g, opponentName)
      .replace(/{tacklerName}/g, tacklerName);
  }

  private generateGeneralCommentaryFromDatabase(event: any, playerName: string, race: string, gamePhase: string, context: CommentaryContext): string {
    const teamName = event.teamName || 'the team';
    
    // Use midGameFlow for general commentary
    const commentary = [...fantasyCommentaryDatabase.midGameFlow];
    
    const selectedCommentary = commentary[Math.floor(Math.random() * commentary.length)];
    return selectedCommentary
      .replace(/{teamName}/g, teamName)
      .replace(/{playerName}/g, playerName);
  }

  // 1. Game State & Flow Commentary
  generatePreGameCommentary(homeTeam: Team, awayTeam: Team, homeFieldSize?: string, tacticalFocus?: string): string {
    const homeTeamName = homeTeam.name;
    const awayTeamName = awayTeam.name;
    const homeTier = this.getTeamPowerTier(homeTeam);
    const awayTier = this.getTeamPowerTier(awayTeam);

    const preGameCommentary = [
      `Welcome to the dome, folks! A tense atmosphere here as the '${homeTier}' ${homeTeamName} prepares to face the '${awayTier}' ${awayTeamName}!`,
      `Both teams are on the field, and the energy from this home crowd is absolutely electric!`,
      `The stage is set for a classic showdown. ${homeTeamName} is coming out with their '${tacticalFocus || 'Balanced'}' strategy, looking to control the game from the start.`,
      `${awayTeamName} has prepared well for this matchup, a clear sign of respect for the home team's capabilities.`,
      `It's a clash of styles today! We'll see how these two teams match up in this exciting contest.`,
      `The players are set. The ball is live. Here we go!`
    ];

    return preGameCommentary[Math.floor(Math.random() * preGameCommentary.length)];
  }

  generateMidGameFlowCommentary(context: CommentaryContext): string {
    const midGameCommentary = [
      "We're seeing a real midfield battle unfold. The ball has changed hands multiple times in the last minute alone.",
      "The pace of this game is relentless! Non-stop action from end to end with no stoppages.",
      "A real war of attrition in the center of the field. Neither team is giving an inch.",
      "Just a chaotic scramble for possession right now, the ball is a pinball out there.",
      "The physicality of this game is off the charts. Every yard is being earned the hard way.",
      "With no referees to blow the whistle, this match flows like a raging river - continuous and unstoppable!",
      "The beauty of this sport - no boundaries, no breaks, just pure athletic contest from start to finish!",
      "Players are diving, weaving, and fighting for every inch in this endless battle for possession!",
      "This is what makes fantasy sports so thrilling - the action never stops, the intensity never fades!"
    ];

    return midGameCommentary[Math.floor(Math.random() * midGameCommentary.length)];
  }

  generateUrgencyCommentary(context: CommentaryContext): string {
    const timeRemaining = context.maxTime - context.gameTime;
    const minutesLeft = Math.floor(timeRemaining / 60);

    if (timeRemaining < 60 && context.currentHalf === 2) {
      return "We're in the final minute of the game! Every second counts!";
    } else if (timeRemaining < 120 && context.currentHalf === 1) {
      return "Just two minutes left in the half! Teams need to make something happen quickly if they want to score before the break.";
    } else if (timeRemaining < 180) {
      return "Time is becoming a factor now. The urgency is building on the field.";
    }

    return "The clock continues to tick as both teams battle for control.";
  }

  // 2. Loose Ball Commentary
  generateLooseBallCommentary(cause: 'tackle' | 'drop', tackler?: Player, carrier?: Player, receiver?: Player): string {
    if (cause === 'tackle' && tackler && carrier) {
      const tacklerName = this.getPlayerDisplayName(tackler);
      const carrierName = this.getPlayerDisplayName(carrier);
      
      const tackleCommentary = [
        `HUGE HIT by ${tacklerName}! The ball comes loose! It's a fumble and anyone's game!`,
        `Powerful tackle from ${tacklerName} dislodges the ball! It's on the turf!`,
        `${carrierName} couldn't hang on after that vicious hit! The ball is LIVE!`,
        `He coughed it up! A massive forced fumble by the defense!`,
        `Stripped! ${tacklerName} rips the ball free from ${carrierName}'s grasp!`,
        `The ball pops free after a gang tackle!`
      ];
      
      return tackleCommentary[Math.floor(Math.random() * tackleCommentary.length)];
    } else if (cause === 'drop' && receiver) {
      const receiverName = this.getPlayerDisplayName(receiver);
      
      const dropCommentary = [
        `The pass is on target but it's DROPPED by ${receiverName}! The ball is live on the turf!`,
        `Right through his hands! ${receiverName} can't hang on and the ball is up for grabs!`,
        `Oh, he has to catch that! The ball bounces off the receiver's chest and is loose!`,
        `An unforced error there, as ${receiverName} simply drops the ball.`,
        `A difficult catch, and ${receiverName} can't bring it in. The ball is loose.`
      ];
      
      return dropCommentary[Math.floor(Math.random() * dropCommentary.length)];
    }

    // Generic scramble commentary
    const scrambleCommentary = [
      "Chaos around the ball! A mad scramble as multiple players dive for it!",
      "A pile-up for the loose ball near midfield!",
      "The ball is loose and it's anyone's game!"
    ];
    
    return scrambleCommentary[Math.floor(Math.random() * scrambleCommentary.length)];
  }

  generateRecoveryCommentary(recoverer: Player, teamName: string, isOffensiveRecovery: boolean): string {
    const recovererName = this.getPlayerDisplayName(recoverer);
    
    if (isOffensiveRecovery) {
      const offensiveRecovery = [
        `The offense manages to recover their own fumble! A lucky break for them.`,
        `Quick thinking by ${recovererName} to scoop up the loose ball before the defense could react!`,
        `What a recovery! ${recovererName} dives on the ball to secure possession for his team!`
      ];
      return offensiveRecovery[Math.floor(Math.random() * offensiveRecovery.length)];
    } else {
      const defensiveRecovery = [
        `And it's the defense that comes up with it! A massive momentum swing!`,
        `${recovererName} emerges from the pile with the ball! A huge turnover for ${teamName}!`,
        `Defensive recovery! ${recovererName} alertly scoops up the loose ball!`
      ];
      return defensiveRecovery[Math.floor(Math.random() * defensiveRecovery.length)];
    }
  }


  private generateRaceBasedRunCommentary(runner: Player, yards: number): string | null {
    const runnerName = this.getPlayerDisplayName(runner);
    
    switch (runner.race?.toLowerCase()) {
      case 'umbra':
        if (Math.random() < 0.3) {
          return `Where did he go?! ${runnerName} seems to vanish for a moment with his Shadow Step, and the defender is left tackling empty space for ${yards} yards!`;
        }
        break;
      case 'sylvan':
        if (Math.random() < 0.3) {
          return `The Sylvan runner shows off that natural agility, weaving through defenders with ease for ${yards} yards.`;
        }
        break;
      case 'gryll':
        if (Math.random() < 0.3) {
          return `It's like trying to tackle a boulder! The Gryll runner ${runnerName} simply shrugs off the hit and keeps moving for ${yards} yards.`;
        }
        break;
    }
    return null;
  }


  // 5. Defense & Aggression Commentary
  generateDefenseCommentary(tackler: Player, carrier: Player, yards: number, skill?: string): string {
    const tacklerName = this.getPlayerDisplayName(tackler);
    const carrierName = this.getPlayerDisplayName(carrier);

    // Skill-Based Defense
    if (skill === "Pancake Block") {
      const pancakeCommentary = [
        `PANCAKED! ${tacklerName} absolutely levels an opponent with a devastating block, clearing a path for his teammate!`,
        `Bone-rattling hit! ${tacklerName} knocks his opponent completely off his feet!`,
        `${tacklerName} just steamrolled his man! What a devastating block!`
      ];
      return pancakeCommentary[Math.floor(Math.random() * pancakeCommentary.length)];
    }

    // High Power Tackles
    if ((tackler.power || 0) > 30) {
      const powerTackleCommentary = [
        `A thunderous tackle by ${tacklerName}! You could hear that one from up here.`,
        `Vicious hit! ${tacklerName} completely stops the runner's momentum.`,
        `${tacklerName} delivers a bone-crushing tackle, bringing down ${carrierName} after ${yards} yards.`,
        `What a hit! ${tacklerName} plants ${carrierName} right where he stands!`
      ];
      return powerTackleCommentary[Math.floor(Math.random() * powerTackleCommentary.length)];
    }

    // Standard Tackles
    const standardTackleCommentary = [
      `${tacklerName} wraps up ${carrierName} for the tackle after a ${yards}-yard gain.`,
      `Solid defense by ${tacklerName}, bringing down ${carrierName}.`,
      `${tacklerName} closes in and makes the stop.`,
      `Nowhere to go! ${carrierName} is smothered by the defense.`,
      `A textbook tackle by ${tacklerName}.`
    ];
    return standardTackleCommentary[Math.floor(Math.random() * standardTackleCommentary.length)];
  }

  // Duplicate function removed - already defined above

  // 6. Contextual & Atmospheric Commentary
  generateInjuryCommentary(player: Player, severity: 'minor' | 'moderate' | 'severe'): string {
    const playerName = this.getPlayerDisplayName(player);
    
    const injuryCommentary = [
      `${playerName} is leveled by a powerful tackle! He's slow to get up... and the team trainer is signaling from the sideline. That looks like a **${severity.charAt(0).toUpperCase() + severity.slice(1)} Injury**.`,
      `${playerName} is down on the field after that hard hit. The medical staff is checking on him.`,
      `Ouch! ${playerName} took a hard shot on that play. He's moving gingerly as he gets back to his feet.`
    ];
    return injuryCommentary[Math.floor(Math.random() * injuryCommentary.length)];
  }

  generateFatigueCommentary(player: Player, action: 'run' | 'pass'): string {
    const playerName = this.getPlayerDisplayName(player);
    
    if (action === 'run') {
      const fatigueRunCommentary = [
        `${playerName} tries to turn the corner but just doesn't have the legs, brought down after a short gain. You can see the fatigue setting in.`,
        `${playerName} looks exhausted as he trudges back to position. The long game is taking its toll.`,
        `The legs are heavy on ${playerName} after that long possession.`
      ];
      return fatigueRunCommentary[Math.floor(Math.random() * fatigueRunCommentary.length)];
    } else {
      const fatiguePassCommentary = [
        `A wobbly pass from ${playerName}, who looks exhausted after that long possession. The ball sails wide.`,
        `${playerName} is clearly feeling the effects of fatigue. That throw lacked his usual zip.`,
        `You can see ${playerName} breathing heavily as he sets up for the next play.`
      ];
      return fatiguePassCommentary[Math.floor(Math.random() * fatiguePassCommentary.length)];
    }
  }

  generateAtmosphereCommentary(context: CommentaryContext): string {
    if (context.intimidationFactor && context.intimidationFactor > 70) {
      const atmosphereCommentary = [
        "The home crowd is deafening right now, and it looks like the away team is having trouble with their timing!",
        "This crowd is absolutely electric! The noise is incredible!",
        "The atmosphere in this stadium is off the charts! You can feel the energy from here!"
      ];
      return atmosphereCommentary[Math.floor(Math.random() * atmosphereCommentary.length)];
    }
    return "";
  }

  generateCamaraderieCommentary(teamCamaraderie: number, isPositive: boolean): string {
    if (isPositive && teamCamaraderie > 75) {
      const positiveCommentary = [
        "You can see the chemistry on display! Perfect timing and coordination between teammates!",
        "That's what team chemistry looks like! Beautiful execution!",
        "The cohesion of this team is really showing through right now!"
      ];
      return positiveCommentary[Math.floor(Math.random() * positiveCommentary.length)];
    } else if (!isPositive && teamCamaraderie < 35) {
      const negativeCommentary = [
        "A miscommunication on offense! The timing was completely off on that play.",
        "You can see the frustration building. This team is not on the same page right now.",
        "That looked like a breakdown in communication. They're not clicking as a unit."
      ];
      return negativeCommentary[Math.floor(Math.random() * negativeCommentary.length)];
    }
    return "";
  }

  // Scoring Commentary
  generateScoringCommentary(scorer: Player, teamName: string, scoreType: 'rushing' | 'passing'): string {
    const scorerName = this.getPlayerDisplayName(scorer);
    
    const scoringCommentary = [
      `He's in! ${scorerName} fights through the defense and crosses the line! A Score for ${teamName}!`,
      `SCORE! A brilliant individual effort by ${scorerName}!`,
      `${scorerName} walks it in! The defense couldn't lay a hand on him!`,
      `A hard-fought score, with ${scorerName} pushing through a pile of players at the goal line!`,
      `What a finish! ${scorerName} caps off a great drive with the score!`
    ];
    return scoringCommentary[Math.floor(Math.random() * scoringCommentary.length)];
  }

  // Additional commentary methods needed by matchStateManager
  generateTackleCommentary(tackler: Player): string {
    const tacklerName = this.getPlayerDisplayName(tackler);
    
    const tackleCommentary = [
      `${tacklerName} wraps up the orb carrier for the tackle!`,
      `Solid defensive play by ${tacklerName}!`,
      `${tacklerName} brings down the runner!`,
      `Nice tackle by ${tacklerName} to limit the damage!`,
      `${tacklerName} closes in and makes the stop!`
    ];
    
    if (tackler.race === 'gryll') {
      tackleCommentary.push(`${tacklerName} delivers a crushing Gryll tackle!`);
      tackleCommentary.push(`The Gryll's power stops the runner cold!`);
    }
    
    return tackleCommentary[Math.floor(Math.random() * tackleCommentary.length)];
  }
  
  generateKnockdownCommentary(blocker: Player): string {
    const blockerName = this.getPlayerDisplayName(blocker);
    
    const knockdownCommentary = [
      `${blockerName} lays out an opponent with a devastating block!`,
      `HUGE HIT! ${blockerName} delivers a crushing blow!`,
      `${blockerName} sends the opponent flying with that block!`,
      `What a hit by ${blockerName}! The crowd feels that one!`,
      `${blockerName} delivers a bone-rattling knockdown!`
    ];
    
    return knockdownCommentary[Math.floor(Math.random() * knockdownCommentary.length)];
  }
  
  // Second duplicate function removed - using first implementation
  
  generateIncompletePassCommentary(passer: Player): string {
    const passerName = this.getPlayerDisplayName(passer);
    
    const incompleteCommentary = [
      `${passerName}'s pass sails incomplete.`,
      `${passerName} couldn't find his target on that attempt.`,
      `The pass by ${passerName} is off the mark.`,
      `${passerName} misfires on that pass attempt.`,
      `${passerName}'s throw is just out of reach.`
    ];
    
    return incompleteCommentary[Math.floor(Math.random() * incompleteCommentary.length)];
  }
  
  generateNoTargetCommentary(passer: Player): string {
    const passerName = this.getPlayerDisplayName(passer);
    
    const noTargetCommentary = [
      `${passerName} looks to pass but finds no one open.`,
      `${passerName} scans the field but can't find a target.`,
      `${passerName} is looking for an open teammate but comes up empty.`,
      `${passerName} holds the orb but has nowhere to throw it.`,
      `${passerName} can't find an opening in the defense.`
    ];
    
    return noTargetCommentary[Math.floor(Math.random() * noTargetCommentary.length)];
  }
  
  generateHalftimeCommentary(): string {
    const halftimeCommentary = [
      'The battle pauses as teams regroup at the midpoint.',
      'Half-time break - both teams head to their areas to plan their next moves.',
      'The first half is complete. What adjustments will be made?',
      'Time for teams to catch their breath and strategize.',
      'The orb is set aside as the half-time horn sounds.'
    ];
    
    return halftimeCommentary[Math.floor(Math.random() * halftimeCommentary.length)];
  }
  
  generateKickoffCommentary(possessingTeam: string): string {
    const kickoffCommentary = [
      `The orb is in play! ${possessingTeam} team starts with possession.`,
      `Let the battle begin! ${possessingTeam} team has the orb first.`,
      `The match is underway with ${possessingTeam} team in control.`,
      `${possessingTeam} team receives the orb to start the action.`,
      `The contest begins! ${possessingTeam} team has first possession.`
    ];
    
    return kickoffCommentary[Math.floor(Math.random() * kickoffCommentary.length)];
  }
  
  generateGeneralPlayCommentary(): string {
    const generalCommentary = [
      'The action continues on the field.',
      'Players are positioning themselves for the next play.',
      'The battle for field position goes on.',
      'Both teams are looking for an advantage.',
      'The contest remains intense.'
    ];
    
    return generalCommentary[Math.floor(Math.random() * generalCommentary.length)];
  }


}

export const commentaryService = new CommentaryService();