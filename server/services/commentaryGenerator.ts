interface Player {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: string;
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  agility: number;
  stamina: number;
  leadership: number;
  kicking: number;
  inGameStamina?: number;
}

interface GameState {
  timeRemaining: number;
  quarter: number;
  homeScore: number;
  awayScore: number;
  possession: 'home' | 'away';
}

export class CommentaryGenerator {
  
  // Category 1: General Play & Game Flow
  private getGeneralPlayCommentary(gameState: GameState): string[] {
    const advancingBall = [
      "Methodically working their way up the field, controlling the pace.",
      "Patient ball movement as they probe for weaknesses in the defense.",
      "Taking their time, carefully advancing into enemy territory.",
      "Steady progress as they push deeper into the opponent's half.",
      "Controlling the flow of the game with deliberate field position.",
      "Working the ball forward with precision and patience.",
      "Grinding out yards as they establish field dominance.",
      "Systematically dismantling the defensive formation.",
      "Patiently building their attack, step by methodical step.",
      "Dictating the tempo with their measured advance."
    ];

    const midfieldBattle = [
      "Back and forth in the center, neither team gaining clear advantage.",
      "Fierce midfield battle with momentum swinging wildly.",
      "The center of the arena becomes a brutal stalemate.",
      "Trading possessions in an intense midfield war.",
      "Neither team can establish dominance in this slugfest.",
      "Deadlocked in the middle, both sides refusing to yield.",
      "A chess match unfolding in the center of the field.",
      "Relentless competition for every inch of field position.",
      "The battle lines drawn firmly in the neutral zone.",
      "Evenly matched forces clashing in the arena's heart."
    ];

    const defensivePressure = [
      "Pinned back in their own zone under relentless pressure!",
      "Defensive backs against the wall, desperately holding ground!",
      "Cornered in their own territory, fighting for breathing room!",
      "Pushed deep into their defensive zone, scrambling to escape!",
      "Backs to their own goal line, nowhere left to retreat!"
    ];

    const timeUrgency = [
      "Clock winding down, time becoming a precious commodity!",
      "Seconds ticking away as the half draws to a close!",
      "Time running out, urgency building with every tick!",
      "The clock is now the enemy as precious seconds disappear!",
      "Racing against time as the period nears its end!"
    ];

    const lowStamina = [
      "Visibly fatigued, struggling to keep pace with the action.",
      "Exhaustion showing as they labor to maintain position.",
      "Gasping for air, the toll of the game clearly evident.",
      "Heavy breathing betrays their dwindling energy reserves.",
      "Fatigue setting in, movements becoming more labored."
    ];

    // Return appropriate commentary based on game state
    if (gameState.timeRemaining < 120) return timeUrgency;
    return [...advancingBall, ...midfieldBattle, ...defensivePressure, ...lowStamina];
  }

  // Category 2: The Ball Carrier (Running)
  private getBallCarrierCommentary(player: Player): string[] {
    const playerName = player.lastName || player.firstName || player.name;
    
    if (player.role === 'runner' && player.speed >= 30) {
      return [
        `${playerName} explodes through the gap with blazing speed!`,
        `Lightning-fast acceleration from ${playerName}!`,
        `${playerName} hits another gear, leaving defenders in the dust!`,
        `Explosive breakaway speed from ${playerName}!`,
        `${playerName} turns on the afterburners!`,
        `Blistering pace from ${playerName} as they pull away!`,
        `${playerName} with the burst of speed that separates champions!`,
        `Like a rocket, ${playerName} streaks down the field!`,
        `${playerName} showcases that elite acceleration!`,
        `Pure speed on display as ${playerName} breaks free!`
      ];
    }

    if (player.role === 'runner' && player.agility >= 30) {
      return [
        `${playerName} jukes left, spins right, and breaks free!`,
        `Incredible agility from ${playerName}, making defenders miss!`,
        `${playerName} with the slick moves, dancing through traffic!`,
        `Ankle-breaking agility on display from ${playerName}!`,
        `${playerName} cuts and weaves like a master!`,
        `Silky smooth moves from ${playerName}, defenders grasping at air!`,
        `${playerName} with the footwork of a ballet dancer!`,
        `Defenders can't lay a hand on the elusive ${playerName}!`,
        `${playerName} makes it look effortless with those moves!`,
        `Poetry in motion as ${playerName} evades the tackle!`
      ];
    }

    if (player.power >= 30) {
      return [
        `${playerName} powers through the tackle attempt!`,
        `Bulldozer strength from ${playerName}, defenders bouncing off!`,
        `${playerName} runs through that hit like it was nothing!`,
        `Incredible power display as ${playerName} breaks the tackle!`,
        `${playerName} with the truck stick, bowling over the defender!`,
        `Raw power on display from ${playerName}!`,
        `${playerName} refuses to go down, powering forward!`,
        `Like a freight train, ${playerName} plows ahead!`,
        `${playerName} shows why they're built like a tank!`,
        `Unstoppable force meets moveable object as ${playerName} advances!`
      ];
    }

    if (player.stamina <= 20) {
      return [
        `${playerName} gets caught from behind, fatigue taking its toll.`,
        `Exhaustion slows ${playerName} down at the worst moment.`,
        `${playerName} had the lead but tired legs cost them.`,
        `Fatigue becomes the defender's best friend as ${playerName} is caught.`,
        `${playerName} runs out of gas just when speed was needed most.`
      ];
    }

    if (player.role === 'passer') {
      return [
        `${playerName} looks uncomfortable running with the ball.`,
        `Not built for running, ${playerName} struggles with ball carrying duties.`,
        `${playerName} forced to scramble, clearly out of their element.`,
        `Running isn't their strong suit as ${playerName} labors forward.`,
        `${playerName} doing their best with unfamiliar ball carrying responsibilities.`
      ];
    }

    return [`${playerName} advances with the ball.`];
  }

  // Category 3: The Passing Game
  private getPassingCommentary(passer: Player, receiver?: Player, result: 'accurate' | 'inaccurate' | 'dropped' | 'intercepted' | 'caught' = 'accurate'): string[] {
    const passerName = passer.lastName || passer.firstName || passer.name;
    const receiverName = receiver ? (receiver.lastName || receiver.firstName || receiver.name) : "the receiver";

    if (result === 'accurate' && passer.throwing >= 30) {
      return [
        `${passerName} threads the needle with a perfect spiral!`,
        `A frozen rope from ${passerName}, absolutely pinpoint!`,
        `${passerName} delivers a thing of beauty downfield!`,
        `Picture-perfect pass from ${passerName}!`,
        `${passerName} with surgical precision on that throw!`,
        `Laser-guided accuracy from ${passerName}!`,
        `${passerName} places it exactly where only ${receiverName} can get it!`,
        `Textbook throw from ${passerName}, couldn't be more perfect!`,
        `${passerName} with the dart, right on the money!`,
        `Absolute perfection from ${passerName}'s right arm!`
      ];
    }

    if (result === 'inaccurate' && passer.throwing <= 20) {
      return [
        `Wobbly pass from ${passerName}, making the catch difficult!`,
        `${passerName} throws a duck, receiver has to adjust!`,
        `Off-target throw from ${passerName}, not their best effort.`,
        `${passerName} sailing that one high and wide.`,
        `Inaccurate pass from ${passerName}, receiver working hard to get to it.`,
        `${passerName} missing the mark on that attempt.`,
        `Poor throw from ${passerName}, putting pressure on the receiver.`,
        `${passerName} with the errant pass, way off the intended target.`,
        `${passerName} struggling with accuracy on that one.`,
        `${passerName} throwing behind the receiver, timing all wrong.`
      ];
    }

    if (result === 'caught' && receiver && receiver.catching >= 30) {
      return [
        `${receiverName} plucks it out of the air like a seasoned pro!`,
        `Secure catch in traffic by ${receiverName}!`,
        `${receiverName} with the sure hands, hauling it in!`,
        `Perfect catch by ${receiverName}, making it look easy!`,
        `${receiverName} with the grab, outstanding concentration!`,
        `${receiverName} secures the pass with authority!`,
        `Outstanding catch by ${receiverName} in tight coverage!`,
        `${receiverName} with the textbook reception!`,
        `${receiverName} brings it down cleanly despite the pressure!`,
        `Beautiful catch by ${receiverName}, hands like glue!`
      ];
    }

    if (result === 'dropped' && receiver && receiver.catching <= 20) {
      return [
        `${receiverName} can't hang onto it, ball hits the hands and bounces away!`,
        `Dropped pass! ${receiverName} had it in their hands!`,
        `${receiverName} with the butter fingers, ball slips through!`,
        `Right through the hands of ${receiverName}!`,
        `${receiverName} drops a catchable ball, missed opportunity!`,
        `Ball bounces off ${receiverName}'s hands, should have been caught!`,
        `${receiverName} unable to secure the pass, hits the ground!`,
        `Costly drop by ${receiverName}, that was right in the breadbasket!`,
        `${receiverName} lets it slip away, poor concentration!`,
        `${receiverName} with the drop, ball pops up and falls incomplete!`
      ];
    }

    if (result === 'intercepted') {
      return [
        `INTERCEPTED! Defender jumps the route and snatches it away!`,
        `Pick six potential! Defender with the incredible read!`,
        `Defender with the interception, reading the pass perfectly!`,
        `Ball stolen away! Defender anticipates the throw beautifully!`,
        `Intercepted! Defender with the athletic grab in traffic!`
      ];
    }

    return [`${passerName} attempts a pass to ${receiverName}.`];
  }

  // Category 4: Defense & Aggression
  private getDefenseCommentary(defender: Player, action: 'hit' | 'tackle' | 'injury' | 'fumble' | 'miss'): string[] {
    const defenderName = defender.lastName || defender.firstName || defender.name;

    if (action === 'hit' && defender.role === 'blocker') {
      return [
        `${defenderName} absolutely de-cleats the opponent! What a hit!`,
        `THUNDEROUS collision from ${defenderName}! Pancaked!`,
        `${defenderName} delivers the boom! Defender sees stars!`,
        `Bone-rattling hit from ${defenderName}! Crowd goes wild!`,
        `${defenderName} with the crushing blow! Opponent folded in half!`,
        `Devastating impact from ${defenderName}! That's gonna hurt tomorrow!`,
        `${defenderName} brings the pain! Opponent crumpled to the ground!`,
        `Vicious hit from ${defenderName}! Defender got his bell rung!`,
        `${defenderName} with the monster hit! Opponent seeing cartoon birds!`,
        `Absolutely brutal collision from ${defenderName}! What a shot!`,
        `${defenderName} delivers the knockout blow! Opponent is shaken up!`,
        `Punishing hit from ${defenderName}! That's why they wear armor!`,
        `${defenderName} with the slobberknocker! Opponent won't remember that!`,
        `Spine-tingling hit from ${defenderName}! Crowd on their feet!`,
        `${defenderName} brings the hammer down! Opponent flattened!`
      ];
    }

    if (action === 'tackle' && defender.power >= 30) {
      return [
        `Vicious tackle from ${defenderName}! Bone-rattling impact!`,
        `${defenderName} with the thunderous hit! Ball carrier demolished!`,
        `Crushing tackle by ${defenderName}! What a collision!`,
        `${defenderName} delivers the devastating blow! Crowd gasps!`,
        `Punishing tackle from ${defenderName}! That's gonna leave a mark!`,
        `${defenderName} with the bone-crusher! Opponent folded like a lawn chair!`,
        `Brutal tackle by ${defenderName}! Ball carrier got his world rocked!`,
        `${defenderName} brings the thunder! Massive collision!`,
        `Devastating hit from ${defenderName}! Opponent might need help up!`,
        `${defenderName} with the crushing tackle! What raw power!`
      ];
    }

    if (action === 'injury') {
      return [
        `${defenderName} makes the tackle, but the opponent stays down, grabbing their knee. That does not look good.`,
        `Hard hit by ${defenderName}, and the ball carrier is slow to get up. Trainers rushing onto the field.`,
        `${defenderName} with the tackle, but the opponent is writhing in pain. Serious injury concern here.`,
        `Tackle by ${defenderName}, and the opponent is not moving. Medical staff needed immediately.`,
        `${defenderName} brings down the runner, but they're clutching their shoulder. Injury timeout called.`
      ];
    }

    if (action === 'fumble') {
      return [
        `${defenderName} strips the ball loose! Fumble on the field!`,
        `Ball knocked out by ${defenderName}! It's loose!`,
        `${defenderName} forces the fumble with that crushing hit!`,
        `Ball jarred loose by ${defenderName}! Scramble for possession!`,
        `${defenderName} punches the ball out! Turnover opportunity!`
      ];
    }

    if (action === 'miss') {
      return [
        `${defenderName} lunges and misses! Runner breaks free!`,
        `${defenderName} whiffs on the tackle attempt! Opportunity missed!`,
        `${defenderName} dives but comes up empty! Runner escapes!`,
        `Miss by ${defenderName}! Ball carrier slips away!`,
        `${defenderName} can't bring down the runner! Missed tackle!`
      ];
    }

    return [`${defenderName} makes the defensive play.`];
  }

  // Category 5: Scoring & Post-Score Events
  private getScoringCommentary(player: Player): string[] {
    const playerName = player.lastName || player.firstName || player.name;
    
    return [
      `${playerName} crosses the line! SCORE!`,
      `He's in! ${playerName} finds the end zone!`,
      `TOUCHDOWN! ${playerName} with the brilliant individual effort!`,
      `${playerName} breaks through for the score! They've done it!`,
      `Into the end zone goes ${playerName}! What a finish!`,
      `${playerName} punches it in! SCORE!`,
      `${playerName} with the heroic effort! He's in for the touchdown!`,
      `SCORE! ${playerName} caps off the drive with style!`,
      `${playerName} fights through for the touchdown! Incredible!`,
      `${playerName} reaches paydirt! TOUCHDOWN!`
    ];
  }

  private getPostScoreCommentary(): string[] {
    return [
      "Wild celebration as the crowd erupts! Teams preparing for the reset.",
      "Jubilation on the sideline as players embrace! Getting ready for kickoff.",
      "Massive celebration in the end zone! Teams regrouping for restart.",
      "Pure elation as teammates mob the scorer! Preparing to reset the field.",
      "Incredible celebration as the crowd goes wild! Reset imminent."
    ];
  }

  // Category 6: Game States
  private getHalftimeReport(homeTeam: string, awayTeam: string, homeScore: number, awayScore: number, homePossession: number, awayPossession: number): string {
    const leadingTeam = homeScore > awayScore ? homeTeam : awayTeam;
    const trailingTeam = homeScore > awayScore ? awayTeam : homeTeam;
    const scoreDiff = Math.abs(homeScore - awayScore);
    
    return `HALFTIME REPORT: ${homeTeam} ${homeScore}, ${awayTeam} ${awayScore}. 
    Possession time: ${homeTeam} ${Math.round(homePossession)}%, ${awayTeam} ${Math.round(awayPossession)}%. 
    ${leadingTeam} leads by ${scoreDiff} at the break. MVP candidates emerging on both sides as we head to the second half.`;
  }

  private getEndGameSummary(homeTeam: string, awayTeam: string, homeScore: number, awayScore: number, keyPlayer?: Player): string {
    const winner = homeScore > awayScore ? homeTeam : awayTeam;
    const finalScore = `${homeTeam} ${homeScore}, ${awayTeam} ${awayScore}`;
    const playerName = keyPlayer ? (keyPlayer.lastName || keyPlayer.firstName || keyPlayer.name) : "";
    
    const summaries = [
      `FINAL: ${finalScore}. In the end, ${winner}'s defense was just too powerful.`,
      `FINAL: ${finalScore}. A masterful performance secures the victory for ${winner}.`,
      `FINAL: ${finalScore}. ${winner} prevails in a hard-fought battle.`,
      `FINAL: ${finalScore}. Dominant display from ${winner} when it mattered most.`,
      `FINAL: ${finalScore}. ${winner} emerges victorious in this thrilling contest.`
    ];

    if (keyPlayer) {
      summaries.push(`FINAL: ${finalScore}. A masterful performance from ${playerName} secured the win for ${winner}.`);
    }

    return summaries[Math.floor(Math.random() * summaries.length)];
  }

  // Main method to generate commentary based on context
  public generateCommentary(
    type: 'general' | 'ballCarrier' | 'passing' | 'defense' | 'scoring' | 'halftime' | 'endGame',
    gameState: GameState,
    player?: Player,
    receiver?: Player,
    options?: {
      action?: 'hit' | 'tackle' | 'injury' | 'fumble' | 'miss' | 'accurate' | 'inaccurate' | 'dropped' | 'intercepted' | 'caught';
      homeTeam?: string;
      awayTeam?: string;
      homePossession?: number;
      awayPossession?: number;
    }
  ): string {
    
    switch (type) {
      case 'general':
        const generalOptions = this.getGeneralPlayCommentary(gameState);
        return generalOptions[Math.floor(Math.random() * generalOptions.length)];
        
      case 'ballCarrier':
        if (!player) return "Player advances with the ball.";
        const carrierOptions = this.getBallCarrierCommentary(player);
        return carrierOptions[Math.floor(Math.random() * carrierOptions.length)];
        
      case 'passing':
        if (!player) return "Pass attempt.";
        const passingOptions = this.getPassingCommentary(player, receiver, options?.action as any);
        return passingOptions[Math.floor(Math.random() * passingOptions.length)];
        
      case 'defense':
        if (!player) return "Defensive play.";
        const defenseOptions = this.getDefenseCommentary(player, options?.action as any || 'tackle');
        return defenseOptions[Math.floor(Math.random() * defenseOptions.length)];
        
      case 'scoring':
        if (!player) return "SCORE!";
        const scoringOptions = this.getScoringCommentary(player);
        return scoringOptions[Math.floor(Math.random() * scoringOptions.length)];
        
      case 'halftime':
        return this.getHalftimeReport(
          options?.homeTeam || "Home", 
          options?.awayTeam || "Away", 
          gameState.homeScore, 
          gameState.awayScore,
          options?.homePossession || 50,
          options?.awayPossession || 50
        );
        
      case 'endGame':
        return this.getEndGameSummary(
          options?.homeTeam || "Home", 
          options?.awayTeam || "Away", 
          gameState.homeScore, 
          gameState.awayScore,
          player
        );
        
      default:
        return "The action continues on the field.";
    }
  }

  // Generate player performance card
  public generatePlayerCard(player: Player, gameStats: any): string {
    const playerName = player.lastName || player.firstName || player.name;
    const role = player.role.charAt(0).toUpperCase() + player.role.slice(1);
    
    return `PLAYER SPOTLIGHT: ${playerName} (${role})
    Performance: Scores: ${gameStats.scores || 0}, Yards: ${gameStats.yards || 0}, Tackles: ${gameStats.tackles || 0}`;
  }
}

export const commentaryGenerator = new CommentaryGenerator();