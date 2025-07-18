# Realm Rivalry - Match Simulation Mechanics Documentation

## Enhanced Live Match Simulation System

Realm Rivalry features a sophisticated real-time match simulation engine that integrates multiple game systems to create authentic, immersive sports experiences.

## Pre-Game Setup & Modifier Calculation

### 1. Home Field Advantage System

**Field Size Effects** (Applied to Home Team Only):
- **Small Field**: 
  - +2 Power bonus to all home team players
  - Emphasizes close-quarters, physical gameplay
  - Favors teams with strong blocking and power-based strategies

- **Large Field**: 
  - +2 Speed and +1 Agility bonus to all home team players
  - Promotes speed-based and passing gameplay
  - Advantages teams with mobile, agile players

- **Standard Field**: 
  - +1 Stamina bonus to all home team players
  - Balanced gameplay with endurance advantages
  - Neutral benefits for all tactical approaches

**Intimidation Factor Calculation**:
```
AttendanceRate = Min(100, 60 + (FanLoyalty × 0.4))
IntimidationFactor = (FanLoyalty × AttendanceRate) / 100
CrowdNoiseDebuff = Floor(IntimidationFactor / 20)
```

**Away Team Penalties**:
- Crowd noise reduces away team Catching and Throwing by CrowdNoiseDebuff amount
- Maximum debuff of -5 to each stat in hostile environments
- Effect scales with stadium capacity and fan loyalty

### 2. Team Camaraderie Effects Integration

**Five-Tier Camaraderie System**:

**Excellent (91-100)**:
- +2 Catching, +2 Agility, +3 Pass Accuracy
- No fumble risk
- Enhanced clutch performance

**Good (76-90)**:
- +1 Catching, +1 Agility, +2 Pass Accuracy
- No fumble risk
- Solid performance bonuses

**Average (41-75)**:
- No stat modifiers
- Baseline performance
- No special effects

**Low (26-40)**:
- -1 Catching, -1 Agility, -1 Pass Accuracy
- Slightly increased error chance
- Reduced clutch performance

**Poor (0-25)**:
- -2 Catching, -2 Agility, -3 Pass Accuracy
- +2% Fumble Risk during handoffs
- Significant performance penalties

### 3. Tactical Modifiers Application

**Field Size Tactical Benefits**:
- Pass Range Modifier: Large fields increase throwing distance
- Stamina Depletion: Small fields increase fatigue rates
- Blocker Range: Field size affects blocking effectiveness
- Power Bonus: Tactical focus modifies strength applications

**Tactical Focus Effects**:
- **Balanced**: No penalties, moderate bonuses across all areas
- **All-Out Attack**: Enhanced offensive stats, reduced defensive positioning
- **Defensive Wall**: Improved defensive stats, reduced offensive risk-taking

**Coach Effectiveness Multiplier**:
```
CoachEffectiveness = 0.5 + (HeadCoachTacticsRating / 100)
Range: 0.5x to 1.5x tactical modifier effectiveness
```

## Turn-Based Simulation Engine

### Game Phase Detection

**Dynamic Phase Progression**:
- **Early (0-25% game time)**: Base difficulty, standard play calling
- **Middle (25-75% game time)**: Normal game flow and decision making
- **Late (75-90% game time)**: Increased intensity, fatigue effects
- **Clutch (90-100% game time)**: Maximum pressure, camaraderie amplification

### Action Resolution System

**Team Selection Logic**:
```
TeamEventChance = TeamStrength / (HomeTeamStrength + AwayTeamStrength)
```

**Event Type Generation**:
1. **Pass Attempts**: Base 60% success rate + camaraderie effects
2. **Run Attempts**: Base 50% success rate + camaraderie effects  
3. **Defensive Plays**: Reactive events based on opposition actions

**Skill Integration Effects**:
- **Juke Move**: Enhanced breakaway chance, improved run commentary
- **Truck Stick**: Power-based tackle breaking, intimidation effects
- **Deadeye**: Improved pass accuracy, precision-focused commentary
- **Pocket Presence**: Enhanced protection from pressure
- **Pancake Block**: Devastating defensive hits

### Camaraderie Impact on Events

**Pass Success Modification**:
```
BasePassSuccess = 60%
CamaraderieModifier = TeamCamaraderie > 75 ? +10% : TeamCamaraderie < 35 ? -10% : 0%
FinalPassSuccess = BasePassSuccess + CamaraderieModifier
```

**Fumble Risk (Poor Camaraderie Teams)**:
- Teams with 0-25 camaraderie: 2% chance of miscommunication fumbles
- Only applies during handoff situations
- Creates realistic consequences for poor team chemistry

## Dynamic Commentary Engine

### Commentary System Features

**200+ Unique Variations**: Commentary adapts to:
- Player actions and skill demonstrations
- Game situations and score differentials  
- Atmospheric conditions and crowd reactions
- Racial characteristics and player backgrounds
- Fatigue levels and stamina conditions

### Commentary Categories

**Run Play Commentary**:
- **Standard Runs**: Basic rushing attempts with player names
- **Breakaway Runs**: Explosive plays over 15 yards
- **Power Runs**: Short-yardage situations emphasizing strength
- **Skill-Based Runs**: Juke Move and Truck Stick variations

**Pass Play Commentary**:
- **Completions**: Standard catches with yardage details
- **Long Passes**: Explosive completions over 20 yards
- **Incompletions**: Failed attempts with situational context
- **Skill Demonstrations**: Deadeye and Pocket Presence highlights

**Defensive Commentary**:
- **Standard Tackles**: Basic defensive stops
- **Clutch Tackles**: Game-critical defensive plays
- **Skill Tackles**: Pancake Block demonstrations
- **Interceptions**: Turnover situations with impact

**Atmospheric Commentary**:
- **Crowd Reactions**: Stadium noise and energy levels
- **Fatigue Observations**: Player stamina and endurance
- **Momentum Shifts**: Game flow and team advantage

### Player Name Integration

**Smart Name Display**:
```
Priority Order:
1. Player.lastName (if not "Player" or "AI")
2. Player.firstName (if not "Player" or "AI") 
3. Player.name (if not generic)
4. Role-based fallback names (Quarterback, Speedster, Guardian)
```

## Consumable System Integration

### Match Limits and Activation

**Usage Restrictions**:
- Maximum 3 consumables per team per league match
- Exhibition matches: No consumable restrictions
- Pre-match activation only (cannot use during live simulation)

**Consumable Categories**:

**Recovery Items**:
- Basic Stamina Drink: Moderate stamina restoration
- Advanced Recovery Serum: Enhanced stamina and minor stat boost
- Medical Kits: Injury prevention and recovery acceleration

**Performance Boosters**:
- Speed Boost Tonic: Temporary speed enhancement
- Power Surge Potion: Strength amplification for power plays
- Champion's Blessing: Multi-stat enhancement for critical matches

### Integration with Match Events

**Single-Game Effects**:
- Consumables provide temporary stat modifications
- Effects last for entire match duration
- Items consumed after match completion
- No carry-over effects to subsequent matches

## Atmospheric Effects System

### Crowd Dynamics Calculation

**Attendance Factors**:
```
BaseAttendance = 35%
LoyaltyBonus = (FanLoyalty × 0.4) up to 50%
WinStreakBonus = CurrentWinStreak × 3% up to 15%
FinalAttendance = Min(100%, BaseAttendance + LoyaltyBonus + WinStreakBonus)
```

**Crowd Noise Impact**:
- Affects away team communication
- Influences player concentration
- Modifies commentary tone and energy
- Creates realistic home field advantage

### Game Phase Atmospheric Effects

**Momentum Tracking**:
```
ScoreDifferential = HomeScore - AwayScore
HomeMomentum = Max(0, Min(100, 50 + (ScoreDifferential × 10)))
AwayMomentum = 100 - HomeMomentum
```

**Weather Effects** (Future Expansion):
- Wind conditions affecting pass accuracy
- Rain reducing field traction
- Temperature influencing player stamina

## Advanced Tactical Effects

### Situational AI Adjustments

**Game Situation Detection**:
- **Winning Big**: Conservative play calling, clock management
- **Losing Big**: Desperation mode, high-risk strategies
- **Late & Close**: Clutch performance emphasis, camaraderie critical

**AI Behavior Modifications**:
```
if (scoreDifference >= 2 && timeRemaining < 25%) {
  // Losing team: Aggressive, high-risk plays
  riskTolerance += 0.4;
  aggressionModifier = 1.6;
} else if (scoreDifference <= -2 && timeRemaining < 25%) {
  // Winning team: Conservative, clock control
  riskTolerance -= 0.4;
  conservativeModifier = 1.5;
}
```

### Coach Effectiveness Integration

**Tactical Focus Amplification**:
- Coach tactics rating (0-40) influences tactical effectiveness
- High-rated coaches maximize tactical benefits
- Poor coaches reduce tactical focus impact

**Situational Coaching**:
- Clutch game management based on coach leadership
- Timeout usage and strategic decision timing
- Player substitution and formation adjustments

## Match Statistics & Tracking

### Real-Time Statistics

**Core Match Stats**:
- Possession percentage based on team strength ratios
- Pass completion rates with accuracy tracking
- Interception and turnover frequency
- Player-specific performance metrics

**Performance Calculations**:
```
PossessionPercentage = TeamStrength / (HomeStrength + AwayStrength) × 100
PassAccuracy = CompletedPasses / AttemptedPasses × 100
TurnoverRate = Turnovers / TotalPlays × 100
```

### Post-Match Processing

**MVP Calculation**:
```
MVPScore = (Scores × 10) + (Catches × 3) + (PassAttempts × 0.5) + 
           (RushingYards × 0.1) + (Knockdowns × 2) + (Tackles × 1.5)
```

**Team Performance Impact**:
- Camaraderie updates based on match results
- Individual player development opportunities
- Injury risk assessment and recovery planning
- Fan loyalty adjustments based on performance

## Technical Implementation

### Simulation Timing

**Match Duration**:
- Exhibition matches: 20 minutes (10 minutes per half) = 1200 seconds
- League matches: 30 minutes (15 minutes per half) = 1800 seconds
- Real-time viewing: 3 real minutes per half (6 minutes total)

**Event Generation**:
- Random intervals: 10-40 seconds between events
- Event density increases during clutch phases
- Fatigue effects modify event frequency

### State Management

**Live Match Synchronization**:
- Real-time game state updates for multiple viewers
- Event broadcasting for synchronized viewing
- Automatic state persistence for match replay

**Performance Optimization**:
- Efficient event generation algorithms
- Minimal database writes during simulation
- Cached team and player data for speed

## Integration with Game Economy

### Revenue Impact Calculations

**Attendance-Based Revenue**:
```
TicketSales = ActualAttendance × 25₡
Concessions = ActualAttendance × 8₡ × ConcessionsLevel
Parking = (ActualAttendance × 0.3) × 10₡ × ParkingLevel
VIPSuites = VIPSuitesLevel × 5,000₡
Merchandise = ActualAttendance × 3₡ × MerchandisingLevel
```

**Atmosphere Bonus**:
- High fan loyalty provides additional revenue per attendee
- Championship matches generate premium pricing
- Rivalry games increase attendance and revenue

### Fan Loyalty Updates

**End-of-Season Calculation**:
```
NewFanLoyalty = CurrentLoyalty + WinPercentageBonus + ChampionshipBonus + 
                FacilityBonus - DecayFactor
```

**Win Percentage Impact**:
- >70% win rate: +15 fan loyalty
- 50-70% win rate: +5 fan loyalty  
- 30-50% win rate: No change
- <30% win rate: -10 fan loyalty

This comprehensive match simulation system creates authentic sports experiences where team chemistry, tactical decisions, player skills, and stadium atmosphere all combine to influence competitive outcomes.