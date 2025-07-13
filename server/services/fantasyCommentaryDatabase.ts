/**
 * Fantasy Sports Commentary Database
 * Implements comprehensive commentary for Realm Rivalry fantasy sports simulation
 */

export interface CommentaryDatabase {
  preGame: string[];
  midGameFlow: string[];
  urgencyClockManagement: string[];
  looseBallTackle: string[];
  looseBallDrop: string[];
  looseBallScramble: string[];
  standardRuns: string[];
  breakawayRuns: string[];
  skillBasedRuns: string[];
  raceBasedRuns: Record<string, string[]>;
  standardCompletions: string[];
  deepPasses: string[];
  skillBasedPasses: string[];
  raceBasedPasses: Record<string, string[]>;
  standardTackles: string[];
  highPowerTackles: string[];
  interceptions: string[];
  passDefense: string[];
  injury: string[];
  fatigue: string[];
  atmosphere: string[];
  camaraderie: string[];
  scoring: string[];
}

export const fantasyCommentaryDatabase: CommentaryDatabase = {
  preGame: [
    "Welcome to the dome, folks! A tense atmosphere here as the 'Elite' {homeTeam} prepares to face the 'Competitive' {awayTeam}!",
    "Both teams are on the field, and the energy from this home crowd is absolutely electric!",
    "The stage is set for a classic showdown. {homeTeam} is coming out with their '{homeStrategy}' strategy, looking to overwhelm {awayTeam} from the start.",
    "{awayTeam} has opted for a '{awayStrategy}' formation today, a clear sign of respect for the home team's powerful offense.",
    "It's a clash of styles today! We'll see if {homeTeam}'s aggressive tactics can break down the disciplined defense of {awayTeam}.",
    "The players are set. The ball is live. Here we go!"
  ],

  midGameFlow: [
    "We're seeing a real midfield battle unfold. The ball has changed hands three times in the last minute alone.",
    "{teamName} is putting together a long spell of possession now, patiently working the ball and testing the defense for any sign of weakness.",
    "The pace of this game is relentless! Non-stop action from end to end with no stoppages.",
    "A real war of attrition in the center of the field. Neither team is giving an inch.",
    "You can feel the momentum starting to shift in favor of {teamName}. They've controlled the ball for the last two minutes of game time.",
    "Just a chaotic scramble for possession right now, the ball is a pinball out there.",
    "The physicality of this game is off the charts. Every yard is being earned the hard way.",
    "{teamName} seems to be controlling the tempo, forcing their opponent to react."
  ],

  urgencyClockManagement: [
    "Just two minutes left in the half! {teamName} needs to make something happen quickly if they want to score before the break.",
    "With the clock winding down, {playerName} is trying to force the issue, looking for any opening.",
    "Time is becoming a factor now. {teamName} is playing with a real sense of urgency.",
    "The first half comes to a close! A frantic pace right to the end.",
    "We're in the final minute of the game! Every second counts!",
    "They need to hurry if they want to get one more possession."
  ],

  looseBallTackle: [
    "HUGE HIT by {tacklerName}! The ball comes loose! It's a fumble and anyone's game!",
    "Powerful tackle from {tacklerName} dislodges the ball! It's on the turf!",
    "{carrierName} couldn't hang on after that vicious hit! The ball is LIVE!",
    "He coughed it up! A massive forced fumble by the defense!",
    "Stripped! {tacklerName} rips the ball free from {carrierName}'s grasp!",
    "The ball pops free after a gang tackle!",
    "He never had control! The ball is loose on the ground!"
  ],

  looseBallDrop: [
    "The pass is on target but it's DROPPED by {receiverName}! The ball is live on the turf!",
    "Right through his hands! {receiverName} can't hang on and the ball is up for grabs!",
    "A perfect pass from {passerName}, but it's a brutal drop by {receiverName} at a critical moment.",
    "Oh, he has to catch that! The ball bounces off the receiver's chest and is loose!",
    "An unforced error there, as {receiverName} simply drops the ball.",
    "The pass is deflected at the last second and falls incomplete... no, it's a live ball!",
    "A difficult catch, and {receiverName} can't bring it in. The ball is loose."
  ],

  looseBallScramble: [
    "Chaos around the ball! A mad scramble as multiple players dive for it!",
    "A pile-up for the loose ball near midfield!",
    "{playerName} emerges from the pile with the ball! A huge turnover for {teamName}!",
    "Quick thinking by {playerName} to scoop up the loose ball before the defense could react!",
    "What a recovery! {playerName} dives on the ball to secure possession for his team!",
    "The offense manages to recover their own fumble! A lucky break for them.",
    "And it's the defense that comes up with it! A massive momentum swing!"
  ],

  standardRuns: [
    "{runnerName} grinds it out for {yards} tough yards up the middle.",
    "{runnerName} finds a small crease and picks up a solid {yards} yards.",
    "A quick dash by {runnerName} for a {yards}-yard gain.",
    "{runnerName} slashes through the defense for {yards} yards.",
    "{runnerName} carries the ball forward for a handful of yards.",
    "He follows his blockers and pushes through for a short gain.",
    "A smart, patient run from {runnerName} to find the opening."
  ],

  breakawayRuns: [
    "He finds a seam! {runnerName} turns on the jets and is in open space for a massive gain!",
    "Explosive speed! {runnerName} leaves the defense in the dust with a {yards}-yard burst!",
    "The crowd is on their feet! {runnerName} hits top gear and is sprinting downfield!",
    "There's no catching him! {runnerName} shows off that world-class speed!",
    "A stunning breakaway run! He was a blur as he raced past the defense.",
    "He just has a gear that nobody else on the field possesses!"
  ],

  skillBasedRuns: [
    "Incredible footwork by {runnerName}! He uses his Juke Move to leave the defender grasping at air!",
    "What a move! {runnerName} cuts left, then right, dancing through traffic for a big gain!",
    "{defenderName} thought he had him, but {runnerName}'s juke was just too quick!",
    "{runnerName} lowers his shoulder and uses Truck Stick, running right over the would-be tackler for extra yards!",
    "Devastating power by {runnerName}! He trucks the defender and refuses to go down!",
    "Pure strength on display! {runnerName} just bulldozed his way through the tackle attempt!"
  ],

  raceBasedRuns: {
    UMBRA: [
      "Where did he go?! {runnerName} seems to vanish for a moment with his Shadow Step, and the defender is left tackling empty space!",
      "The Umbra runner uses his natural stealth to slip through the defense unnoticed!",
      "Shadow magic at work! {runnerName} phases through the tackle attempt!"
    ],
    SYLVAN: [
      "The Sylvan runner shows off that natural agility, weaving through defenders with ease.",
      "Like a dancer in the forest! {runnerName} glides through the defense!",
      "Nature's grace on display as {runnerName} flows around the defenders!"
    ],
    GRYLL: [
      "It's like trying to tackle a boulder! The Gryll runner {runnerName} simply shrugs off the hit and keeps moving.",
      "Raw Gryll power! {runnerName} barrels through the defense like an unstoppable force!",
      "The earth trembles as {runnerName} pounds through the enemy line!"
    ]
  },

  standardCompletions: [
    "{passerName} connects with {receiverName} on the sideline for a gain of {yards}.",
    "A quick pass from {passerName} to {receiverName} to move the chains.",
    "Nice connection between {passerName} and {receiverName} for a solid gain.",
    "{passerName} finds his outlet and completes the pass.",
    "A well-designed play results in an easy completion for {passerName}.",
    "He finds his check-down receiver for a safe and easy {yards} yards."
  ],

  deepPasses: [
    "He's going deep! {passerName} launches one downfield for {receiverName}!",
    "What a strike! {passerName} connects with {receiverName} on a beautiful {yards}-yard completion!",
    "The defense was caught sleeping! {receiverName} is wide open for a huge gain!",
    "{passerName} airs it out! It's a jump ball situation downfield!",
    "A perfect spiral from {passerName} finds his target deep in enemy territory."
  ],

  skillBasedPasses: [
    "Masterful awareness by {passerName}! He feels the pressure and slides away, buying just enough time to deliver the pass!",
    "Incredible poise in the pocket from {passerName}, stepping up gracefully before delivering a strike!",
    "A frozen rope from {passerName}! He threads the needle between two defenders to hit {receiverName} in stride! That's a 'Deadeye' pass if I've ever seen one.",
    "Surgical accuracy by {passerName}! The pass is placed where only his receiver could get it."
  ],

  raceBasedPasses: {
    LUMINA: [
      "That's the precision you expect from a Lumina passer! A beautiful, accurate throw from {passerName}.",
      "Divine accuracy! {passerName} delivers a perfect light-guided pass!",
      "The ball seems to glow as {passerName} delivers it with Lumina precision!"
    ]
  },

  standardTackles: [
    "{tacklerName} wraps up {carrierName} for the tackle after a short gain.",
    "Solid defense by {tacklerName}, bringing down {carrierName}.",
    "{tacklerName} closes in and makes the stop.",
    "Nowhere to go! {carrierName} is smothered by the defense.",
    "A textbook tackle by {tacklerName}."
  ],

  highPowerTackles: [
    "A thunderous tackle by {defenderName}! You could hear that one from up here.",
    "Vicious hit! {tacklerName} completely stops the runner's momentum.",
    "PANCAKED! {blockerName} absolutely levels an opponent with a devastating block, clearing a path for his teammate!",
    "Bone-rattling hit! {blockerName} knocks {opponentName} completely off his feet!",
    "{blockerName} is just looking to inflict pain! He lays a huge hit on an unsuspecting opponent away from the ball! With no referees, that's a smart, brutal play."
  ],

  interceptions: [
    "The pass is picked off! {defenderName} read the play perfectly and stepped in front of the receiver!",
    "What a play! {defenderName} makes a diving interception!",
    "He threw it right to the defense! An easy interception for {defenderName}.",
    "The pass is batted down at the line by the powerful Gryll defender, {defenderName}!",
    "Great coverage by {defenderName}, forcing the drop."
  ],

  passDefense: [
    "Excellent coverage by {defenderName}! The pass is broken up.",
    "The defender makes a play on the ball! Incomplete pass.",
    "{defenderName} gets a hand in there to disrupt the catch.",
    "Perfect timing by {defenderName} to break up the pass.",
    "The defense steps up with a crucial pass deflection!"
  ],

  injury: [
    "{playerName} is leveled by a powerful tackle! He's slow to get up... and the team trainer is signaling from the sideline. That looks like a **{severity} Injury**.",
    "{playerName} is down on the field after that hard hit. The medical staff is checking on him.",
    "Ouch! {playerName} took a hard shot on that play. He's moving gingerly as he gets back to his feet."
  ],

  fatigue: [
    "{playerName} tries to turn the corner but just doesn't have the legs, brought down after a short gain. You can see the fatigue setting in.",
    "A wobbly pass from {playerName}, who looks exhausted after that long possession. The ball sails wide and is now a loose ball!",
    "{playerName} looks exhausted as he trudges back to position. The long game is taking its toll."
  ],

  atmosphere: [
    "The home crowd is deafening right now, and it looks like the away team is having trouble with their timing!",
    "This crowd is absolutely electric! The noise is incredible!",
    "The atmosphere in this stadium is off the charts! You can feel the energy from here!"
  ],

  camaraderie: [
    "You can see the chemistry on display! A perfectly timed block by {blockerName} springs {runnerName} for extra yards!",
    "A miscommunication on offense! {passerName} and {receiverName} were not on the same page, and the pass falls harmlessly to the ground.",
    "That's what team chemistry looks like! Beautiful execution!"
  ],

  scoring: [
    "He's in! {playerName} fights through the defense and crosses the line! A Score for {teamName}!",
    "SCORE! A brilliant individual effort by {playerName}!",
    "They've done it! {passerName} connects with {receiverName} in the end zone for the score!",
    "He walks it in! The defense couldn't lay a hand on him!",
    "A hard-fought score, pushing through a pile of players at the goal line!"
  ]
};