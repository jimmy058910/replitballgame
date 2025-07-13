/**
 * Comprehensive Commentary Service
 * Implements 200+ specific commentary prompts for dynamic, engaging match simulation
 */

import { fantasyCommentaryDatabase } from './fantasyCommentaryDatabase';

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
  
  // Helper Methods
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

  // Enhanced Event Commentary
  generateEventCommentary(event: any, player: any, context: CommentaryContext): string {
    const playerName = this.getPlayerDisplayName(player);
    const race = player.race || 'human';
    const gamePhase = this.determineGamePhase(context);
    
    switch (event.type) {
      case 'pass_complete':
        return this.generatePassCommentary(event, playerName, race, gamePhase, context);
      case 'run_positive':
        return this.generateRunCommentary(event, playerName, race, gamePhase, context);
      case 'score':
        return this.generateScoreCommentary(event, playerName, race, gamePhase, context);
      case 'interception':
        return this.generateDefenseCommentary(event, playerName, race, gamePhase, context);
      case 'tackle':
        return this.generateTackleCommentary(event, playerName, race, gamePhase, context);
      default:
        return this.generateGeneralCommentary(event, playerName, race, gamePhase, context);
    }
  }

  private generatePassCommentary(event: any, playerName: string, race: string, gamePhase: string, context: CommentaryContext): string {
    const baseCommentary = [
      `${playerName} finds his target downfield!`,
      `A precise pass from ${playerName} moves the chains!`,
      `${playerName} threads the needle with that throw!`,
      `Beautiful ball placement by ${playerName}!`
    ];

    // Race-specific commentary
    if (race === 'lumina') {
      baseCommentary.push(`${playerName}'s radiant precision lights up the field!`);
      baseCommentary.push(`The Lumina's natural throwing ability shines through!`);
    } else if (race === 'human') {
      baseCommentary.push(`${playerName} adapts beautifully to the defense!`);
    }

    // Game phase specific
    if (gamePhase === 'clutch') {
      baseCommentary.push(`Under pressure in crunch time, ${playerName} delivers!`);
      baseCommentary.push(`When it matters most, ${playerName} comes through!`);
    }

    return baseCommentary[Math.floor(Math.random() * baseCommentary.length)];
  }

  private generateRunCommentary(event: any, playerName: string, race: string, gamePhase: string, context: CommentaryContext): string {
    const yards = event.yardsGained || 0;
    const baseCommentary = [
      `${playerName} finds a gap and picks up ${yards} yards!`,
      `${playerName} churns forward for a ${yards}-yard gain!`,
      `Nice vision by ${playerName} for ${yards} yards!`
    ];

    // Race-specific commentary
    if (race === 'sylvan') {
      baseCommentary.push(`${playerName} uses Sylvan agility to dance through the defense for ${yards} yards!`);
      baseCommentary.push(`Like wind through the trees, ${playerName} glides for ${yards} yards!`);
    } else if (race === 'gryll') {
      baseCommentary.push(`${playerName} powers through with Gryll strength for ${yards} yards!`);
      baseCommentary.push(`The Gryll's raw power breaks tackles for ${yards} yards!`);
    } else if (race === 'umbra') {
      baseCommentary.push(`${playerName} slips through shadows for ${yards} yards!`);
      baseCommentary.push(`Like a shadow, ${playerName} evades defenders for ${yards} yards!`);
    }

    // Breakaway commentary
    if (yards >= 12) {
      baseCommentary.push(`BREAKAWAY! ${playerName} breaks free for a huge ${yards}-yard run!`);
      baseCommentary.push(`${playerName} is loose! That's a ${yards}-yard gallop!`);
    }

    return baseCommentary[Math.floor(Math.random() * baseCommentary.length)];
  }

  private generateScoreCommentary(event: any, playerName: string, race: string, gamePhase: string, context: CommentaryContext): string {
    const scoreCommentary = [
      `TOUCHDOWN! ${playerName} crosses the goal line!`,
      `SIX POINTS! ${playerName} finds the end zone!`,
      `SCORE! ${playerName} caps off the drive beautifully!`,
      `TOUCHDOWN ${playerName}! What a finish!`
    ];

    // Race-specific scoring commentary
    if (race === 'lumina') {
      scoreCommentary.push(`TOUCHDOWN! ${playerName}'s radiant power illuminates the end zone!`);
    } else if (race === 'gryll') {
      scoreCommentary.push(`TOUCHDOWN! ${playerName} powers through with Gryll determination!`);
    } else if (race === 'sylvan') {
      scoreCommentary.push(`TOUCHDOWN! ${playerName} dances into the end zone with Sylvan grace!`);
    } else if (race === 'umbra') {
      scoreCommentary.push(`TOUCHDOWN! ${playerName} slips into the shadows of the end zone!`);
    }

    // Clutch time commentary
    if (gamePhase === 'clutch') {
      scoreCommentary.push(`CLUTCH TOUCHDOWN! ${playerName} delivers when it matters most!`);
      scoreCommentary.push(`IN THE CLUTCH! ${playerName} rises to the occasion!`);
    }

    return scoreCommentary[Math.floor(Math.random() * scoreCommentary.length)];
  }

  private generateDefenseCommentary(event: any, playerName: string, race: string, gamePhase: string, context: CommentaryContext): string {
    const defenseCommentary = [
      `INTERCEPTION! ${playerName} picks it off!`,
      `${playerName} reads the pass perfectly and intercepts!`,
      `TURNOVER! ${playerName} comes down with the ball!`,
      `Great defensive play by ${playerName}!`
    ];

    // Race-specific defense commentary
    if (race === 'gryll') {
      defenseCommentary.push(`${playerName} uses Gryll instincts to snatch that pass!`);
    } else if (race === 'sylvan') {
      defenseCommentary.push(`${playerName} shows Sylvan reflexes on that interception!`);
    }

    return defenseCommentary[Math.floor(Math.random() * defenseCommentary.length)];
  }

  private generateTackleCommentary(event: any, playerName: string, race: string, gamePhase: string, context: CommentaryContext): string {
    const tackleCommentary = [
      `${playerName} wraps up for the tackle!`,
      `Solid defensive play by ${playerName}!`,
      `${playerName} brings down the runner!`,
      `Nice tackle by ${playerName} to limit the damage!`
    ];

    // Race-specific tackle commentary
    if (race === 'gryll') {
      tackleCommentary.push(`${playerName} delivers a crushing Gryll tackle!`);
      tackleCommentary.push(`The Gryll's power stops the runner cold!`);
    }

    return tackleCommentary[Math.floor(Math.random() * tackleCommentary.length)];
  }

  private generateGeneralCommentary(event: any, playerName: string, race: string, gamePhase: string, context: CommentaryContext): string {
    const generalCommentary = [
      `${playerName} makes a play!`,
      `Good effort by ${playerName}!`,
      `${playerName} stays involved in the action!`
    ];

    return generalCommentary[Math.floor(Math.random() * generalCommentary.length)];
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

  // 3. Run Play Commentary
  generateRunPlayCommentary(runner: Player, yards: number, tackler?: Player, skill?: string): string {
    const runnerName = this.getPlayerDisplayName(runner);

    // Race-Based Runs
    if (runner.race) {
      const raceCommentary = this.generateRaceBasedRunCommentary(runner, yards);
      if (raceCommentary && Math.random() < 0.3) return raceCommentary;
    }

    // Skill-Based Runs
    if (skill === "Juke Move" && yards > 5) {
      const jukeCommentary = [
        `Incredible footwork by ${runnerName}! He uses his Juke Move to leave the defender grasping at air for ${yards} yards!`,
        `What a move! ${runnerName} cuts left, then right, dancing through the scrum for a ${yards}-yard advance!`,
        `The defender thought he had him, but ${runnerName}'s juke was just too quick! ${yards} yards!`,
        `${runnerName} shows off those shifty moves, leaving the defender behind for a ${yards}-yard advance!`
      ];
      return jukeCommentary[Math.floor(Math.random() * jukeCommentary.length)];
    }

    if (skill === "Truck Stick" && yards > 3) {
      const truckCommentary = [
        `${runnerName} lowers his shoulder and uses Truck Stick, running right over the would-be tackler for ${yards} extra yards!`,
        `Devastating power by ${runnerName}! He trucks the defender and refuses to go down for ${yards} yards!`,
        `Pure strength on display! ${runnerName} just bulldozed his way through the tackle attempt for ${yards} yards!`,
        `${runnerName} shows no mercy, bulldozing his way forward for ${yards} yards!`
      ];
      return truckCommentary[Math.floor(Math.random() * truckCommentary.length)];
    }

    // Breakaway Runs (High Speed)
    if (yards > 15) {
      const breakawayCommentary = [
        `He finds a seam! ${runnerName} turns on the jets and is in open space for a massive ${yards}-yard gain!`,
        `Explosive speed! ${runnerName} leaves the defense in the dust with a ${yards}-yard burst!`,
        `The crowd is on their feet! ${runnerName} hits top gear and is sprinting downfield for ${yards} yards!`,
        `There's no catching him! ${runnerName} shows off that world-class speed for ${yards} yards!`,
        `A stunning breakaway run! He was a blur as he raced past the defense for ${yards} yards!`,
        `He just has a gear that nobody else on the field possesses! ${yards} yards!`
      ];
      return breakawayCommentary[Math.floor(Math.random() * breakawayCommentary.length)];
    }

    // Standard Runs
    if (yards <= 3) {
      const shortRunCommentary = [
        `${runnerName} pushes through the scrum for ${yards} hard-earned yards.`,
        `${runnerName} finds a gap in the formation and advances ${yards} yards.`,
        `${runnerName} battles through the pack for a ${yards}-yard advance.`,
        `Smart movement by ${runnerName} to break free for ${yards} yards.`,
        `${runnerName} weaves past defenders in tight quarters for ${yards} yards.`
      ];
      return shortRunCommentary[Math.floor(Math.random() * shortRunCommentary.length)];
    }

    const standardRunCommentary = [
      `${runnerName} finds an opening and picks up a solid ${yards} yards.`,
      `A quick dash by ${runnerName} for a ${yards}-yard advance.`,
      `${runnerName} slashes through the defense for ${yards} yards.`,
      `${runnerName} carries the orb forward for ${yards} yards.`,
      `A smart, patient run from ${runnerName} to find the opening.`
    ];
    return standardRunCommentary[Math.floor(Math.random() * standardRunCommentary.length)];
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

  // 4. Pass Play Commentary
  generatePassPlayCommentary(passer: Player, receiver: Player, completion: boolean, yards?: number, skill?: string): string {
    const passerName = this.getPlayerDisplayName(passer);
    const receiverName = this.getPlayerDisplayName(receiver);

    // Race-Based Passes
    if (passer.race === "lumina" && completion && Math.random() < 0.3) {
      return `That's the precision you expect from a Lumina passer! A beautiful, accurate throw from ${passerName} for ${yards || 0} yards.`;
    }
    
    if (completion) {
      const completionCommentary = [
        `${passerName} connects with ${receiverName} for a ${yards || 0}-yard completion!`,
        `Beautiful pass from ${passerName} to ${receiverName} for ${yards || 0} yards!`,
        `${passerName} finds his target! ${receiverName} hauls it in for ${yards || 0} yards.`,
        `Perfect timing! ${passerName} delivers a strike to ${receiverName}.`,
        `${receiverName} makes the catch for a ${yards || 0}-yard gain!`
      ];
      return completionCommentary[Math.floor(Math.random() * completionCommentary.length)];
    } else {
      const incompletionCommentary = [
        `${passerName}'s pass to ${receiverName} is incomplete.`,
        `${receiverName} couldn't hang on to that pass from ${passerName}.`,
        `The pass breaks up! ${passerName} to ${receiverName} is no good.`,
        `${passerName}'s throw is just out of ${receiverName}'s reach.`,
        `${receiverName} can't make the catch on that attempt.`
      ];
      return incompletionCommentary[Math.floor(Math.random() * incompletionCommentary.length)];
    }

    // Skill-Based Passes
    if (skill === "Pocket Presence" && Math.random() < 0.4) {
      const pocketCommentary = [
        `Masterful awareness by ${passerName}! He feels the pressure and slides away, buying just enough time to deliver the pass!`,
        `Incredible poise in the pocket from ${passerName}, stepping up gracefully before delivering a strike!`,
        `${passerName} displays veteran composure, calmly avoiding the rush before making his throw!`
      ];
      return pocketCommentary[Math.floor(Math.random() * pocketCommentary.length)];
    }

    if (skill === "Deadeye" && completion && yards && yards > 10) {
      const deadeyeCommentary = [
        `A frozen rope from ${passerName}! He threads the needle between two defenders to hit ${receiverName} in stride! That's a 'Deadeye' pass if I've ever seen one.`,
        `Surgical accuracy by ${passerName}! The pass is placed where only his receiver could get it for ${yards} yards.`,
        `Pinpoint precision from ${passerName}! That Deadeye accuracy finds ${receiverName} perfectly for ${yards} yards!`
      ];
      return deadeyeCommentary[Math.floor(Math.random() * deadeyeCommentary.length)];
    }

    if (completion) {
      if (yards && yards > 20) {
        // Deep Passes
        const deepCommentary = [
          `He's going deep! ${passerName} launches one downfield for ${receiverName}!`,
          `What a strike! ${passerName} connects with ${receiverName} on a beautiful ${yards}-yard completion!`,
          `The defense was caught sleeping! ${receiverName} is wide open for a huge gain!`,
          `A perfect spiral from ${passerName} finds his target deep in enemy territory.`
        ];
        return deepCommentary[Math.floor(Math.random() * deepCommentary.length)];
      } else {
        // Standard Completions
        const standardCommentary = [
          `${passerName} connects with ${receiverName} on the sideline for a gain of ${yards || 0}.`,
          `A quick pass from ${passerName} to ${receiverName} to move the chains.`,
          `Nice connection between ${passerName} and ${receiverName} for a solid gain.`,
          `${passerName} finds his outlet and completes the pass.`,
          `He finds his check-down receiver for a safe and easy ${yards || 0} yards.`
        ];
        return standardCommentary[Math.floor(Math.random() * standardCommentary.length)];
      }
    } else {
      // Incomplete passes
      const incompleteCommentary = [
        `The pass from ${passerName} falls incomplete, intended for ${receiverName}.`,
        `${passerName}'s throw sails over ${receiverName}'s head. Incomplete.`,
        `A miscommunication between ${passerName} and ${receiverName}. The pass falls harmlessly to the ground.`,
        `${receiverName} can't quite get to that one. Incomplete pass.`
      ];
      return incompleteCommentary[Math.floor(Math.random() * incompleteCommentary.length)];
    }
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

  generateInterceptionCommentary(defender: Player, passer: Player): string {
    const defenderName = this.getPlayerDisplayName(defender);
    const passerName = this.getPlayerDisplayName(passer);

    const interceptionCommentary = [
      `The pass is picked off! ${defenderName} read the play perfectly and stepped in front of the receiver!`,
      `What a play! ${defenderName} makes a diving interception!`,
      `He threw it right to the defense! An easy interception for ${defenderName}.`,
      `${defenderName} shows great awareness, jumping the route for the interception!`,
      `${passerName}'s pass is intercepted by ${defenderName}! What a momentum swing!`
    ];
    return interceptionCommentary[Math.floor(Math.random() * interceptionCommentary.length)];
  }

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
  
  generatePassDefenseCommentary(passer: Player, defender: Player): string {
    const passerName = this.getPlayerDisplayName(passer);
    const defenderName = this.getPlayerDisplayName(defender);
    
    const passDefenseCommentary = [
      `${passerName}'s pass defended by ${defenderName}. Incomplete.`,
      `Great defensive play by ${defenderName} to break up the pass!`,
      `${defenderName} gets a hand on it! The pass falls incomplete.`,
      `${passerName} couldn't find his target thanks to ${defenderName}'s coverage!`,
      `Excellent defense by ${defenderName} to disrupt the play!`
    ];
    
    return passDefenseCommentary[Math.floor(Math.random() * passDefenseCommentary.length)];
  }
  
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

  // Main commentary generator that selects appropriate commentary based on event type
  generateEventCommentary(
    eventType: string,
    players: { acting?: Player; target?: Player; defensive?: Player },
    teams: { home: Team; away: Team },
    context: CommentaryContext,
    eventData?: any
  ): string {
    
    switch (eventType) {
      case 'rush':
        return this.generateRunPlayCommentary(
          players.acting!,
          eventData?.yards || 0,
          players.defensive,
          eventData?.skill
        );
        
      case 'pass_complete':
        return this.generatePassPlayCommentary(
          players.acting!,
          players.target!,
          true,
          eventData?.yards,
          eventData?.skill
        );
        
      case 'pass_incomplete':
      case 'pass_drop':
        return this.generatePassPlayCommentary(
          players.acting!,
          players.target!,
          false,
          0,
          eventData?.skill
        );
        
      case 'interception':
        return this.generateInterceptionCommentary(
          players.defensive!,
          players.acting!
        );
        
      case 'fumble':
        return this.generateLooseBallCommentary(
          'tackle',
          players.defensive,
          players.acting
        );
        
      case 'score':
        return this.generateScoringCommentary(
          players.acting!,
          eventData?.teamName || '',
          eventData?.scoreType || 'rushing'
        );
        
      case 'tackle':
        return this.generateDefenseCommentary(
          players.defensive!,
          players.acting!,
          eventData?.yards || 0,
          eventData?.skill
        );
        
      default:
        return this.generateMidGameFlowCommentary(context);
    }
  }
}

export const commentaryService = new CommentaryService();