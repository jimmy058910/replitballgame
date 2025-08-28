Enhanced Text-Based Match Engine Specification Dynamic Speed Control System

Based on your event priority system, implement sophisticated speed management: Critical Events (Real-time 1×): Goals, injuries, major knockdowns, turnovers Action: Pause simulation, trigger score popup, show detailed stats Commentary: Full AI-generated play-by-play with race-specific language Visual: Highlight active players, show stamina impact, crowd reaction Important Events (2-3× Speed): Passes, kicks, successful tackles or other defensive plays, substitutions Action: Smooth 2× animation with full commentary Commentary: Contextual AI analysis with tactical insights Visual: Player movement indicators, formation adjustments Standard Events (Fast-forward): Routine plays, middle-field actions, general movement Action: Text-only summaries, visual elements hidden Commentary: Condensed AI summaries ("Both teams trading possession...") Visual: Simplified field representation Downtime (Ultra Fast-forward): Stalemate, no big plays or skills, setting up attacks etc Action: "Fast-forwarding..." banner with time acceleration Commentary: Minimal contextual updates Visual: Static field state Player Stamina Visualization System Field Layout with Player States:

text ┌─────────────────────────────────────────────────────┐ │ 🏟️ STADIUM LEVEL 3 │ ├───────────────────────────────────────────────────── │ SCORE ZONE │ FIELD │ SCORE ZONE │ │ 🟢🟢 │ ⚪ ⚪ ⚪ ⚪ ⚪ │ 🔴🔴 │ │ ████████ │ 🟢 ████ 🔴 ████ 🟢 │ ████████ │ │ │ ⚪ ⚪ ⚪ ⚪ ⚪ │ │ └─────────────────────────────────────────────────────┘ │ Player Stamina: ████████░░ (80%) │ ████░░░░░░ (40%) │ Critical │

Stamina Visual Elements: Green indicators (🟢): Full stamina (80-100%) Yellow indicators (🟡): Moderate fatigue (30-79%) Red indicators (🔴): Critical fatigue (<30%) Pulsing animation: Players requiring substitution Position-specific icons: Different symbols for each role AI Commentary Integration Pre-Match AI Analysis: text 🤖 PRE-MATCH ANALYSIS ═══════════════════════ "The Thunderhawks bring their formidable blockers against the Lightning's swift runners. Key matchup: Thorak's power blocking vs. Whisperwind's agility evasion. With stadium capacity at 89%, expect a ground-heavy game favoring the home team's territorial advantages."

📊 AI Predictions: • Team X speed advantage: +15% • Sylvan stamina factor: Critical in 2nd half

Live Commentary with Race Integration: text ⚡ LIVE COMMENTARY ═════════════════ 12:34 - "Thorak the Gryll demonstrates raw power, bulldozing through the Sylvan line! His racial strength bonus showing as he breaks two tackles. Whisperwind attempts the shadow-step evasion but the momentum is too great!"

🎯 Racial Bonuses Active: • Gryll Power: +4 to tackle-breaking • Sylvan Agility: +3 to evasion attempts • Stamina: Thorak 78% → 74% after power play

Post-Match AI Summary: text 🏆 POST-MATCH ANALYSIS ═══════════════════════ "A tactical masterclass showcasing racial diversity. The Thunderhawks' Gryll-heavy strategy paid dividends in the final quarter, with power plays accounting for 60% of total yardage. Lightning's Sylvan speed kept them competitive until stamina became the deciding factor."

📈 Key Insights: • Racial synergy impact: +23% team efficiency • Stamina management: Critical after minute 25 • MVP performance: Enhanced by leadership attributes

Critical Moment Popup System Score Event Popup Design: text ┌─────────────────────────────────────────────────┐ │ 🎯 SCORE! 🎯 │ │ │ │ ⚡ Lightning Strike by Whisperwind (Last Name) │ │ │ │ 🏃‍♂️ 47-yard breakaway run using natural speed bonus │ │ ⏱️ Stamina: 82% → 78% after burst │ │ │ │ New Score: Lightning 3 - Thunderhawks 1 │ └────────────────────────────────────────────────┘

Key Player Stats During Popup: Individual performance meters Racial bonus applications Stamina usage breakdown Camaraderie impact indicators Stadium Facility Visualization (2.5D Ready) Current Text-Based Stadium Representation: text 🏟️ IRONHOLD STADIUM - LEVEL 3 ════════════════════════════════ Capacity: 25,000 (22,250 attending - 89% full) Facilities: ┌─ Lighting: ██████████ Level 5 (Optimal visibility) ├─ Concessions: ████████░░ Level 4 (Strong revenue) ├─ VIP Suites: ██████░░░░ Level 3 (Moderate luxury) ├─ Parking: ████░░░░░░ Level 2 (Limited spots) └─ Merchandise: ██████████ Level 5 (Premium shops)

🎵 Crowd Energy: HIGH (Team performing well) 💰 Revenue Tracking: ₡12,547 (Live ticker)

2.5D Integration Placeholders: Facility level visual markers prepared for 3D rendering Crowd density mapping for future animation Revenue stream visualization hooks Dynamic lighting system foundation Advanced Attribute Integration Real-Time Stat Calculations: javascript // Stamina Impact on Performance function calculatePerformance(player, currentStamina) { const fatigueMultiplier = currentStamina < 20 ? getFatiguePenalty(currentStamina) : 1.0;

return { effectiveSpeed: player.speed * fatigueMultiplier, effectiveAgility: player.agility * fatigueMultiplier, effectivePower: player.power * (fatigueMultiplier * 0.5 + 0.5), racialBonuses: applyRacialModifiers(player.race, fatigueMultiplier) }; }

// Event Commentary Generation function generateCommentary(event, player) { const raceSpecific = getRaceCommentary(player.race); const attributeContext = getAttributeContext(event.type, player); const situationalModifier = getSituationalContext(gameTime, score);

return aiCommentaryEngine.generate({ race: raceSpecific, attributes: attributeContext, situation: situationalModifier, intensity: event.priority }); }

Future 2.5D Transition Framework Data Structure Preparation: typescript interface Match2DData { // Current text engine data players: PlayerWithPosition[]; events: MatchEvent[]; commentary: CommentaryEntry[];

// 2.5D rendering hooks (prepared but not used) visualElements: { playerModels: ModelReference[]; animations: AnimationSequence[]; stadiumAssets: StadiumAssetMap; effectsQueue: VisualEffect[]; };

// Seamless transition data cameraPositions: CameraState[]; renderingLayers: LayerConfiguration; }

Component Architecture for Future Expansion: Text Engine: Fully functional standalone system Visual Hooks: Prepared interfaces for 2.5D integration Event Mapping: Universal event system works for both text and visual AI Commentary: Compatible with both text and visual presentation Stadium Data: Structured for both text descriptions and 3D rendering Enhanced User Experience Features Interactive Commentary Control: Toggle between AI commentary styles (analytical, casual, technical) Adjust commentary frequency (full, highlights only, minimal) Language and cultural customization for different audiences Advanced Statistics Integration: Live racial performance tracking Attribute effectiveness monitoring Stamina management insights Team synergy measurements Mobile-Optimized Interface: Swipe navigation between match phases Tap-to-expand player details Pinch-to-zoom stadium overview Voice-activated controls for accessibility Technical Implementation Strategy Phase 1: Core Text Engine (Current) Implement dynamic speed control Build AI commentary system Create stamina visualization Develop popup systems Phase 2: Enhanced Visuals (Near-term) Add stadium facility graphics Implement player position indicators Create crowd energy visualizations Build revenue tracking displays Phase 3: 2.5D Integration (Future) Seamless transition to 3D stadium rendering Player model integration Advanced animation systems Cinematic camera controls This comprehensive text-based match engine provides an immersive, strategic experience while maintaining the groundwork for future 2.5D expansion. The AI integration, dynamic speed control, and detailed attribute system create a rich gameplay experience that rivals traditional visual-based sports simulations.

COMPREHENSIVE COMMENTARY SYSTEM ANALYSIS - 7/17/25

Pre-Game Commentary (6 prompts) Statistical Attribution: None (atmospheric only) Team power tier comparison (Elite, Contender, Competitive, Developing, Foundation) Tactical strategy references Stadium atmosphere setup No direct stat changes, sets narrative context
Mid-Game Flow Commentary (9 prompts) Statistical Attribution: None (atmospheric only) Possession battle descriptions Game pace commentary Physical intensity references Continuous action emphasis (no referees)
Urgency/Clock Management (6 prompts) Statistical Attribution: None (atmospheric only) Final minute commentary Half-time pressure situations Time management urgency Clutch situation setup
Loose Ball Commentary (17 prompts) Statistical Attribution: Fumbles, Turnovers, Drops Tackle-Caused Fumbles (7 prompts): +1 forced fumble for tackler, +1 fumble lost for carrier Drop-Caused Fumbles (5 prompts): +1 drop for receiver, +1 fumble for team Recovery Commentary (5 prompts): +1 fumble recovery for recovering player/team
Run Play Commentary (45+ prompts) Statistical Attribution: Rushing yards, Breakaway runs, Skill usage Standard Runs (7 prompts): +rushing yards for runner Breakaway Runs (6 prompts): +rushing yards, +1 breakaway run stat Skill-Based Runs (12 prompts): +rushing yards, +skill usage (Juke Move, Truck Stick) Race-Based Runs (20 prompts): +rushing yards with racial flavor Umbra Shadow Step commentary Sylvan agility-based runs Gryll power-based runs
Pass Play Commentary (35+ prompts) Statistical Attribution: Passing attempts, completions, yards, skill usage Standard Completions (6 prompts): +1 attempt, +1 completion, +passing yards Deep Passes (5 prompts): +1 attempt, +1 completion, +passing yards (20+) Skill-Based Passes (8 prompts): +1 attempt, +1 completion, +skill usage Pocket Presence commentary Deadeye accuracy commentary Race-Based Passes (3 prompts): +1 attempt, +1 completion (Lumina specific) Incomplete Passes (13 prompts): +1 attempt, +0 completions
Defense Commentary (25+ prompts) Statistical Attribution: Tackles, Interceptions, Pass Defense Standard Tackles (5 prompts): +1 tackle for defender High Power Tackles (5 prompts): +1 tackle, +1 knockdown (power stat >30) Interceptions (5 prompts): +1 interception, +1 pass defense Pass Defense (5 prompts): +1 pass defense for defender Knockdown Commentary (5 prompts): +1 knockdown inflicted
Skill-Based Commentary (20+ prompts) Statistical Attribution: Skill usage tracking, enhanced stats Juke Move (4 prompts): +skill usage, enhanced rushing yards Truck Stick (4 prompts): +skill usage, enhanced rushing yards Pocket Presence (3 prompts): +skill usage, enhanced passing Deadeye (3 prompts): +skill usage, +perfect pass stat Pancake Block (3 prompts): +skill usage, +knockdown stat Shadow Step (3 prompts): +skill usage (Umbra racial)
Injury & Fatigue Commentary (9 prompts) Statistical Attribution: Injury tracking, stamina effects Injury Commentary (3 prompts): +injury recorded (minor/moderate/severe) Fatigue Commentary (6 prompts): Stamina-based performance reduction Running fatigue: reduced yards gain Passing fatigue: reduced accuracy
Atmosphere & Camaraderie Commentary (12 prompts) Statistical Attribution: Home field advantage, team chemistry Atmosphere (3 prompts): Home field advantage effects (intimidation >70) Positive Camaraderie (3 prompts): Team chemistry bonus (camaraderie >75) Negative Camaraderie (3 prompts): Team chemistry penalty (camaraderie <35) Stadium Effects (3 prompts): Crowd noise, attendance impact
Scoring Commentary (15 prompts) Statistical Attribution: Scores, rushing/passing TDs General Scoring (5 prompts): +1 score for player/team Race-Specific Scoring (5 prompts): +1 score with racial flavor Clutch Scoring (5 prompts): +1 score, +1 clutch play stat
Contextual Commentary (10 prompts) Statistical Attribution: Various situational stats Halftime Commentary (5 prompts): No stats, game flow Kickoff Commentary (5 prompts): Possession start tracking CRITICAL STAT ATTRIBUTION PATTERNS Individual Player Stats Tracked: Passing attempts/completions/yards Rushing yards/attempts Catches/receiving yards/drops Tackles/knockdowns inflicted Interceptions caught/fumbles lost Scores/clutch plays/breakaway runs Perfect passes/skill usage Team Stats Tracked: Total possession percentage Team passing/rushing yards Team tackles/interceptions Team fumbles/turnovers Home field advantage effects Commentary-to-Stat Accuracy Issues Identified: Race-based commentary frequency: 30% trigger rate may be too high Skill commentary attribution: Some skills don't properly increment usage counters Breakaway run threshold: Set at 12+ yards, may need adjustment Deep pass threshold: Set at 20+ yards, consistent with design Power tackle threshold: Set at 30+ power stat, well-calibrated Enhancement Recommendations: Stat consistency: Ensure all commentary prompts that reference specific actions increment corresponding stats Frequency balancing: Adjust race-based and skill-based commentary trigger rates Contextual accuracy: Match commentary intensity to actual stat significance Missing categories: Add commentary for defensive skills, special formations Seasonal context: Include commentary that references season standings, rivalries The system currently tracks over 50 statistical categories with 200+ unique commentary prompts, creating an immersive experience where every action has both narrative and statistical significance.
—--------

COMPLETE COMMENTARY SYSTEM BREAKDOWN How The System Actually Works: Event Generation → Stat Changes → Commentary Selection Stats are modified in the simulation engine (generatePassEvent, generateRunEvent, etc.) Commentary prompts are selected AFTER stats are changed, based on event type Each event type has specific stat attributions, then commentary is chosen from the appropriate category

ALL 233 COMMENTARY PROMPTS & THEIR STAT ATTRIBUTION

PRE-GAME COMMENTARY (6 prompts) Event Type: pre_game Stat Changes: None (atmospheric setup only)
"Welcome to the dome, folks! A tense atmosphere here as the 'Elite' {homeTeam} prepares to face the 'Competitive' {awayTeam}!"
"Both teams are on the field, and the energy from this home crowd is absolutely electric!"
"The stage is set for a classic showdown. {homeTeam} is coming out with their '{homeStrategy}' strategy, looking to overwhelm {awayTeam} from the start."
"{awayTeam} has opted for a '{awayStrategy}' formation today, a clear sign of respect for the home team's powerful offense."
"It's a clash of styles today! We'll see if {homeTeam}'s aggressive tactics can break down the disciplined defense of {awayTeam}."
"The players are set. The ball is live. Here we go!"
MID-GAME FLOW COMMENTARY (8 prompts) Event Type: general_play Stat Changes: None (flow commentary only)
"We're seeing a real midfield battle unfold. The ball has changed hands three times in the last minute alone."
"{teamName} is putting together a long spell of possession now, patiently working the ball and testing the defense for any sign of weakness."
"The pace of this game is relentless! Non-stop action from end to end with no stoppages."
"A real war of attrition in the center of the field. Neither team is giving an inch."
"You can feel the momentum starting to shift in favor of {teamName}. They've controlled the ball for the last two minutes of game time."
"Just a chaotic scramble for possession right now, the ball is a pinball out there."
"The physicality of this game is off the charts. Every yard is being earned the hard way."
"{teamName} seems to be controlling the tempo, forcing their opponent to react."
URGENCY/CLOCK MANAGEMENT COMMENTARY (6 prompts) Event Type: time_pressure Stat Changes: None (atmospheric only)
"Just two minutes left in the half! {teamName} needs to make something happen quickly if they want to score before the break."
"With the clock winding down, {playerName} is trying to force the issue, looking for any opening."
"Time is becoming a factor now. {teamName} is playing with a real sense of urgency."
"The first half comes to a close! A frantic pace right to the end."
"We're in the final minute of the game! Every second counts!"
"They need to hurry if they want to get one more possession."
LOOSE BALL TACKLE COMMENTARY (7 prompts) Event Type: fumble Stat Changes: +1 fumble for team, +1 forced fumble for tackler
"HUGE HIT by {tacklerName}! The ball comes loose! It's a fumble and anyone's game!"
"Powerful tackle from {tacklerName} dislodges the ball! It's on the turf!"
"{carrierName} couldn't hang on after that vicious hit! The ball is LIVE!"
"He coughed it up! A massive forced fumble by the defense!"
"Stripped! {tacklerName} rips the ball free from {carrierName}'s grasp!"
"The ball pops free after a gang tackle!"
"He never had control! The ball is loose on the ground!"
LOOSE BALL DROP COMMENTARY (7 prompts) Event Type: pass_drop Stat Changes: +1 drop for receiver, +1 passing attempt for passer
"The pass is on target but it's DROPPED by {receiverName}! The ball is live on the turf!"
"Right through his hands! {receiverName} can't hang on and the ball is up for grabs!"
"A perfect pass from {passerName}, but it's a brutal drop by {receiverName} at a critical moment."
"Oh, he has to catch that! The ball bounces off the receiver's chest and is loose!"
"An unforced error there, as {receiverName} simply drops the ball."
"The pass is deflected at the last second and falls incomplete... no, it's a live ball!"
"A difficult catch, and {receiverName} can't bring it in. The ball is loose."
LOOSE BALL SCRAMBLE COMMENTARY (7 prompts) Event Type: fumble_recovery Stat Changes: +1 fumble recovery for recovering player
"Chaos around the ball! A mad scramble as multiple players dive for it!"
"A pile-up for the loose ball near midfield!"
"{playerName} emerges from the pile with the ball! A huge turnover for {teamName}!"
"Quick thinking by {playerName} to scoop up the loose ball before the defense could react!"
"What a recovery! {playerName} dives on the ball to secure possession for his team!"
"The offense manages to recover their own fumble! A lucky break for them."
"And it's the defense that comes up with it! A massive momentum swing!"
STANDARD RUNS COMMENTARY (7 prompts) Event Type: run_positive Stat Changes: +rushing yards for runner
"{runnerName} grinds it out for {yards} tough yards up the middle."
"{runnerName} finds a small crease and picks up a solid {yards} yards."
"A quick dash by {runnerName} for a {yards}-yard gain."
"{runnerName} slashes through the defense for {yards} yards."
"{runnerName} carries the ball forward for a handful of yards."
"He follows his blockers and pushes through for a short gain."
"A smart, patient run from {runnerName} to find the opening."
BREAKAWAY RUNS COMMENTARY (6 prompts) Event Type: run_positive (yards >= 10) Stat Changes: +rushing yards, +1 breakaway run
"He finds a seam! {runnerName} turns on the jets and is in open space for a massive gain!"
"Explosive speed! {runnerName} leaves the defense in the dust with a {yards}-yard burst!"
"The crowd is on their feet! {runnerName} hits top gear and is sprinting downfield!"
"There's no catching him! {runnerName} shows off that world-class speed!"
"A stunning breakaway run! He was a blur as he raced past the defense."
"He just has a gear that nobody else on the field possesses!"
SKILL-BASED RUNS COMMENTARY (6 prompts) Event Type: run_positive (with skill usage) Stat Changes: +rushing yards, +1 skill usage (Juke Move/Truck Stick)
"Incredible footwork by {runnerName}! He uses his Juke Move to leave the defender grasping at air!"
"What a move! {runnerName} cuts left, then right, dancing through traffic for a big gain!"
"{defenderName} thought he had him, but {runnerName}'s juke was just too quick!"
"{runnerName} lowers his shoulder and uses Truck Stick, running right over the would-be tackler for extra yards!"
"Devastating power by {runnerName}! He trucks the defender and refuses to go down!"
"Pure strength on display! {runnerName} just bulldozed his way through the tackle attempt!"
RACE-BASED RUNS COMMENTARY (9 prompts) Event Type: run_positive (race-specific) Stat Changes: +rushing yards (with 30% race commentary chance) UMBRA (3 prompts):
"Where did he go?! {runnerName} seems to vanish for a moment with his Shadow Step, and the defender is left tackling empty space!"
"The Umbra runner uses his natural stealth to slip through the defense unnoticed!"
"Shadow magic at work! {runnerName} phases through the tackle attempt!" SYLVAN (3 prompts):
"The Sylvan runner shows off that natural agility, weaving through defenders with ease."
"Like a dancer in the forest! {runnerName} glides through the defense!"
"Nature's grace on display as {runnerName} flows around the defenders!" GRYLL (3 prompts):
"It's like trying to tackle a boulder! The Gryll runner {runnerName} simply shrugs off the hit and keeps moving."
"Raw Gryll power! {runnerName} barrels through the defense like an unstoppable force!"
"The earth trembles as {runnerName} pounds through the enemy line!"
STANDARD COMPLETIONS COMMENTARY (6 prompts) Event Type: pass_complete Stat Changes: +1 passing attempt, +1 completion, +passing yards
"{passerName} connects with {receiverName} on the sideline for a gain of {yards}."
"A quick pass from {passerName} to {receiverName} to move the chains."
"Nice connection between {passerName} and {receiverName} for a solid gain."
"{passerName} finds his outlet and completes the pass."
"A well-designed play results in an easy completion for {passerName}."
"He finds his check-down receiver for a safe and easy {yards} yards."
DEEP PASSES COMMENTARY (5 prompts) Event Type: pass_complete (yards >= 20) Stat Changes: +1 passing attempt, +1 completion, +passing yards
"He's going deep! {passerName} launches one downfield for {receiverName}!"
"What a strike! {passerName} connects with {receiverName} on a beautiful {yards}-yard completion!"
"The defense was caught sleeping! {receiverName} is wide open for a huge gain!"
"{passerName} airs it out! It's a jump ball situation downfield!"
"A perfect spiral from {passerName} finds his target deep in enemy territory."
SKILL-BASED PASSES COMMENTARY (4 prompts) Event Type: pass_complete (with skill usage) Stat Changes: +1 passing attempt, +1 completion, +passing yards, +1 skill usage (Pocket Presence/Deadeye)
"Masterful awareness by {passerName}! He feels the pressure and slides away, buying just enough time to deliver the pass!"
"Incredible poise in the pocket from {passerName}, stepping up gracefully before delivering a strike!"
"A frozen rope from {passerName}! He threads the needle between two defenders to hit {receiverName} in stride! That's a 'Deadeye' pass if I've ever seen one."
"Surgical accuracy by {passerName}! The pass is placed where only his receiver could get it."
RACE-BASED PASSES COMMENTARY (3 prompts) Event Type: pass_complete (Lumina race) Stat Changes: +1 passing attempt, +1 completion, +passing yards (with 30% race commentary chance) LUMINA (3 prompts):
"That's the precision you expect from a Lumina passer! A beautiful, accurate throw from {passerName}."
"Divine accuracy! {passerName} delivers a perfect light-guided pass!"
"The ball seems to glow as {passerName} delivers it with Lumina precision!"
STANDARD TACKLES COMMENTARY (5 prompts) Event Type: tackle or run_stuffed Stat Changes: +1 tackle for defender
"{tacklerName} wraps up {carrierName} for the tackle after a short gain."
"Solid defense by {tacklerName}, bringing down {carrierName}."
"{tacklerName} closes in and makes the stop."
"Nowhere to go! {carrierName} is smothered by the defense."
"A textbook tackle by {tacklerName}."
HIGH POWER TACKLES COMMENTARY (5 prompts) Event Type: tackle or knockdown (power stat >= 30) Stat Changes: +1 tackle, +1 knockdown inflicted
"A thunderous tackle by {defenderName}! You could hear that one from up here."
"Vicious hit! {tacklerName} completely stops the runner's momentum."
"PANCAKED! {blockerName} absolutely levels an opponent with a devastating block, clearing a path for his teammate!"
"Bone-rattling hit! {blockerName} knocks {opponentName} completely off his feet!"
"{blockerName} is just looking to inflict pain! He lays a huge hit on an unsuspecting opponent away from the ball! With no referees, that's a smart, brutal play."
INTERCEPTIONS COMMENTARY (5 prompts) Event Type: interception Stat Changes: +1 interception for defender
"The pass is picked off! {defenderName} read the play perfectly and stepped in front of the receiver!"
"What a play! {defenderName} makes a diving interception!"
"He threw it right to the defense! An easy interception for {defenderName}."
"The pass is batted down at the line by the powerful Gryll defender, {defenderName}!"
"Great coverage by {defenderName}, forcing the drop."
PASS DEFENSE COMMENTARY (5 prompts) Event Type: pass_incomplete Stat Changes: +1 passing attempt for passer, +1 pass defense for defender
"Excellent coverage by {defenderName}! The pass is broken up."
"The defender makes a play on the ball! Incomplete pass."
"{defenderName} gets a hand in there to disrupt the catch."
"Perfect timing by {defenderName} to break up the pass."
"The defense steps up with a crucial pass deflection!"
INJURY COMMENTARY (3 prompts) Event Type: injury Stat Changes: +1 injury recorded (minor/moderate/severe)
"{playerName} is leveled by a powerful tackle! He's slow to get up... and the team trainer is signaling from the sideline. That looks like a {severity} Injury."
"{playerName} is down on the field after that hard hit. The medical staff is checking on him."
"Ouch! {playerName} took a hard shot on that play. He's moving gingerly as he gets back to his feet."
FATIGUE COMMENTARY (3 prompts) Event Type: fatigue Stat Changes: Performance reduction based on stamina level
"{playerName} tries to turn the corner but just doesn't have the legs, brought down after a short gain. You can see the fatigue setting in."
"A wobbly pass from {playerName}, who looks exhausted after that long possession. The ball sails wide and is now a loose ball!"
"{playerName} looks exhausted as he trudges back to position. The long game is taking its toll."
ATMOSPHERE COMMENTARY (3 prompts) Event Type: atmosphere (intimidation factor > 70) Stat Changes: Away team passing/catching penalty
"The home crowd is deafening right now, and it looks like the away team is having trouble with their timing!"
"This crowd is absolutely electric! The noise is incredible!"
"The atmosphere in this stadium is off the charts! You can feel the energy from here!"
CAMARADERIE COMMENTARY (3 prompts) Event Type: camaraderie (team chemistry effects) Stat Changes: Team performance bonus/penalty based on camaraderie level
"You can see the chemistry on display! A perfectly timed block by {blockerName} springs {runnerName} for extra yards!"
"A miscommunication on offense! {passerName} and {receiverName} were not on the same page, and the pass falls harmlessly to the ground."
"That's what team chemistry looks like! Beautiful execution!"
SCORING COMMENTARY (5 prompts) Event Type: score Stat Changes: +1 score for player, +1 team score
"He's in! {playerName} fights through the defense and crosses the line! A Score for {teamName}!"
"SCORE! A brilliant individual effort by {playerName}!"
"They've done it! {passerName} connects with {receiverName} in the end zone for the score!"
"He walks it in! The defense couldn't lay a hand on him!"
"A hard-fought score, pushing through a pile of players at the goal line!" ADDITIONAL COMMENTARY CATEGORIES (109 MORE PROMPTS)
KICKOFF COMMENTARY (5 prompts) Event Type: kickoff Stat Changes: None (possession change only)
HALFTIME COMMENTARY (5 prompts) Event Type: halftime Stat Changes: None (break in action)
KNOCK DOWN COMMENTARY (5 prompts) Event Type: knockdown Stat Changes: +1 knockdown inflicted
INCOMPLETE PASS COMMENTARY (5 prompts) Event Type: pass_incomplete Stat Changes: +1 passing attempt
NO TARGET COMMENTARY (5 prompts) Event Type: no_target Stat Changes: None (no attempt made)
GENERAL PLAY COMMENTARY (5 prompts) Event Type: general_play Stat Changes: None (filler commentary)
KICK EVENTS COMMENTARY (15 prompts) Event Type: kick_complete, kick_dropped, kick_failed Stat Changes: +kicking yards, +catches/drops for receivers
ENHANCED SKILL COMMENTARY (35 prompts) Various skill-based events with specific stat attribution
RACE-SPECIFIC ENHANCED COMMENTARY (30 prompts) Race-based variations for all major event types
CRITICAL STAT ATTRIBUTION SUMMARY Individual Player Stats Modified: Passing: attempts, completions, yards, perfect passes Rushing: yards, attempts, breakaway runs Receiving: catches, yards, drops Defense: tackles, interceptions, knockdowns inflicted Skills: usage tracking for all player abilities Scores: touchdowns, clutch plays Injuries: severity tracking, recovery time Team Stats Modified: Possession: calculated from team strength ratio Team totals: passing, rushing, tackles, interceptions, fumbles Atmosphere effects: home field advantage, crowd noise impact Camaraderie effects: team chemistry bonuses/penalties Commentary Selection Logic: Event Generated → Stats Modified → Commentary Selected 30% chance for race-specific commentary variants Skill-based commentary triggered by skill usage Contextual commentary based on game phase, score, time

COMPLETE ATTRIBUTE SYSTEM for Realm Rivalry and how every attribute affects gameplay:

🎯 CORE PLAYER ATTRIBUTES

SPEED Range: 1-50+ (with bonuses) Primary Effect: Movement, evasion, breakaway potential Simulation Impact: Determines running play success rate Affects tackle evasion probability Influences breakaway touchdown chances Higher speed = more "burst through defense" events Commentary Integration: "Lightning fast!", "Outpaces the defense", "Speed demon breaks free" Race Bonuses: Sylvan (+2), Umbra (enhanced) Equipment: Speed Boost Tonic (+temporary), various gear stat bonuses

POWER Range: 1-50+ (with bonuses) Primary Effect: Blocking, tackling, breaking tackles Simulation Impact: Blocking effectiveness for protecting runners/passers Tackle-breaking ability when carrying the ball Knockdown resistance and dealing knockdowns Determines "power through defense" event success Commentary Integration: "Bulldozes through!", "Devastating block", "Unstoppable force" Race Bonuses: Gryll (+4), reduced for Sylvan (-1) Skills: Power Block (+4), Immovable Object (+8)

THROWING Range: 1-50+ (with bonuses) Primary Effect: Passing accuracy and distance Simulation Impact: Pass completion percentage Long pass attempt success rate Accuracy under pressure situations Determines "perfect spiral" and "touchdown pass" events Commentary Integration: "Perfect throw!", "Cannon arm", "Threading the needle" Race Bonuses: Lumina (+3) Skills: Strong Arm (+4 + power), Cannon Arm (+8 + power), Field General (+2)

CATCHING Range: 1-50+ (with bonuses) Primary Effect: Receiving passes, ball security Simulation Impact: Reception success rate Fumble resistance when caught Contested catch ability "Spectacular catch" and "sure hands" event generation Commentary Integration: "Amazing catch!", "Sticky fingers", "Reels it in" Skills: Iron Grip (+4), Magnetic Hands (+8), Void Hands (+godly bonuses)

KICKING Range: 1-50+ (with bonuses) Primary Effect: Special teams performance Simulation Impact: Field goal accuracy and distance Punt distance and placement Extra point reliability Critical for close game situations Commentary Integration: "Splits the uprights!", "Booming kick", "Clutch kicker"

STAMINA Range: 1-50+ (with bonuses) Primary Effect: Endurance throughout match Simulation Impact: CRITICAL FATIGUE SYSTEM: Below 20 stamina triggers penalties Speed: -1 per 5 stamina lost Agility: -1 per 5 stamina lost Power: -0.5 per 5 stamina lost Affects late-game performance significantly Determines substitution needs Commentary Integration: "Showing fatigue", "Still fresh", "Running on fumes" Race Benefits: Gryll (+2), Sylvan (natural recovery), Lumina (team healing)

LEADERSHIP Range: 1-50+ (with bonuses) Primary Effect: Team coordination and morale Simulation Impact: Team-wide performance bonuses Affects camaraderie calculations Influences clutch-time performance Determines captain eligibility Skill acquisition chances (higher leadership = better ability progression) Commentary Integration: "Takes charge!", "Rallies the team", "Natural leader" Race Bonuses: Lumina (+2) Skills: Iron Will (+3), Field General (+7), Omniscience (+10)

AGILITY Range: 1-50+ (with bonuses) Primary Effect: Change of direction, evasion Simulation Impact: Dodge probability in tackles Route-running effectiveness Fumble recovery ability Affects defensive positioning Commentary Integration: "Nimble footwork!", "Slips the tackle", "Cat-like reflexes" Race Bonuses: Sylvan (+3), enhanced for Umbra Skills: Nimble Dodge (+4), Sixth Sense (+5)

🏃‍♂️ RACIAL GAMEPLAY MODIFIERS

HUMANS - "Adaptable" No stat penalties, balanced across all attributes Universal versatility - can excel at any position Skill affinity: Iron Grip, Strong Arm, Iron Will, Field General

SYLVAN - "Nature's Athletes" Speed +2, Agility +3 (natural enhancement) Photosynthesis: 10% chance per turn to recover +2 stamina during matches Speed -1 when stamina drops below 15 (relies on natural energy) Skills: Swift Feet, Nimble Dodge, Lightning Step

GRYLL - "Unstoppable Force" Power +4, Stamina +2 (natural strength) Speed -1 (less mobile but more durable) Unshakeable: 30% chance to reduce knockdown timer by 5 seconds Equipment mastery: +effectiveness from all equipped gear Skills: Power Block, Immovable Object

LUMINA - "Tactical Mastery" Throwing +3, Leadership +2 (mental superiority) Healing Light: 5% chance per turn to grant +1 stamina to all teammates Perfect accuracy bonus in clutch situations (final 25% of match time) Skills: Iron Will, Field General, Omniscience

UMBRA - "Shadow Dancers" Enhanced Speed and Agility (values scale with base stats) Shadow Step: Advanced evasion mechanics, harder to tackle Night vision: +performance in low-light/dome stadium conditions Skills: Swift Feet, Nimble Dodge, specialized shadow abilities

⚙️ ADVANCED SYSTEMS

CAMARADERIE EFFECTS Range: 0-100% 75-100%: +performance bonus across all stats 50-74%: Neutral performance 25-49%: Minor penalties, increased injury risk 0-24%: Major penalties, contract demands, potential departure

FATIGUE & STAMINA MANAGEMENT Current vs Base Stamina: Dynamic during matches Recovery Rate: Race-dependent (Sylvan fastest, Gryll moderate) Critical Threshold: Below 20 triggers escalating penalties Equipment: Recovery items restore stamina between/during matches

EQUIPMENT STAT BONUSES Additive System: Equipment bonuses stack with base stats Temporary Boosts: Consumables provide match-specific enhancements Race Interaction: Gryll gets enhanced effectiveness from all equipment

ABILITY/SKILL PROGRESSION 4-Tier System: Basic → Advanced → Expert → Godly Acquisition: Based on leadership attribute + race/position affinity Stacking: Multiple abilities can combine for massive bonuses Prerequisites: Advanced abilities require specific basic abilities first

🎮 SIMULATION EVENT GENERATION

Event Types by Attribute Speed-Based: Breakaway runs, evasion, chase-down tackles Power-Based: Knockdowns, tackle breaks, blocking dominance Throwing-Based: Perfect passes, long bombs, accuracy under pressure Catching-Based: Spectacular catches, fumble prevention, contested balls Agility-Based: Juke moves, tackle slips, route precision Leadership-Based: Team rallies, clutch performance, coordination plays

Commentary System Integration Race-Specific: "Sylvan speed", "Gryll power", "Lumina precision" Stat-Driven: Commentary changes based on actual attribute values Context-Aware: Different phrases for clutch vs regular time Skill-Referenced: Special commentary for ability-triggered events

Match Outcome Calculations Weighted System: Each attribute contributes to different play types Situational Modifiers: Attributes have different importance in different scenarios Team Synergy: Leadership affects how well individual stats combine Fatigue Scaling: Late-game importance shifts to stamina-dependent attributes
