# Realm Rivalry - Racial Systems & Match Simulation Documentation

## Fantasy Races Overview

Realm Rivalry features 5 distinct fantasy races, each with unique stat modifiers and abilities that affect gameplay in different ways.

### 1. Human
**Racial Identity**: The balanced and adaptable race
- **Stat Modifiers**: +1 to ALL attributes
- **Special Traits**: Jack-of-all-trades racial versatility
- **Strengths**: Well-rounded performance across all positions
- **Weaknesses**: No specialized attribute peaks
- **Best Positions**: Any (most flexible race)

### 2. Sylvan (Forest Dwellers)
**Racial Identity**: The agile speedsters
- **Stat Modifiers**: 
  - +3 Speed (Enhanced mobility)
  - +4 Agility (Superior reflexes)
  - -2 Power (Lighter build)
- **Special Traits**: Photosynthesis ability for stamina recovery
- **Strengths**: Excellent runners and pass catchers
- **Weaknesses**: Limited power for blocking roles
- **Best Positions**: Runner, Passer (mobility roles)

### 3. Gryll (Mountain Warriors)
**Racial Identity**: The powerhouse defenders
- **Stat Modifiers**:
  - +5 Power (Maximum strength bonus)
  - +3 Stamina (Enhanced endurance)
  - -3 Speed (Heavier build)
  - -2 Agility (Less nimble)
- **Special Traits**: Unshakeable, Master Craftsman abilities
- **Strengths**: Dominant blockers and defensive players
- **Weaknesses**: Limited mobility for speed positions
- **Best Positions**: Blocker (defensive specialist)

### 4. Lumina (Light Beings)
**Racial Identity**: The tactical leaders
- **Stat Modifiers**:
  - +4 Throwing (Precision passing)
  - +3 Leadership (Natural commanders)
  - -1 Stamina (Energy drain from abilities)
- **Special Traits**: Healing Light ability
- **Strengths**: Elite passers and team coordinators
- **Weaknesses**: Slightly reduced endurance
- **Best Positions**: Passer (natural quarterbacks)

### 5. Umbra (Shadow Walkers)
**Racial Identity**: The elusive tacticians
- **Stat Modifiers**:
  - +2 Speed (Quick movement)
  - +3 Agility (Shadow-like reflexes)
  - -3 Power (Reduced strength)
  - -1 Leadership (Lone wolf nature)
- **Special Traits**: Shadow Step ability for evasion
- **Strengths**: Excellent runners and receivers
- **Weaknesses**: Poor leadership and blocking ability
- **Best Positions**: Runner, some passing roles

## Racial Modifier Application

**Implementation Details**:
- Modifiers are applied AFTER base stat generation
- Final attribute cap remains at 40 for all races
- Modifiers affect tryout generation, team strength calculations, and match performance
- Race-specific abilities have 4-tier progression (Tier 1-4) based on player leadership stats

## Match Simulation Impact

### Racial Bonuses in Team Strength Calculation
- **Sylvan**: 1.1x multiplier (10% bonus)
- **Gryll**: 1.05x multiplier (5% bonus)  
- **Lumina**: 1.08x multiplier (8% bonus)
- **Umbra**: 1.07x multiplier (7% bonus)
- **Human**: 1.03x multiplier (3% bonus)

These multipliers are applied to average player stats when calculating overall team strength for match simulations.

---

# Match Simulation Mechanics

## Enhanced Live Match Simulation System

### Pre-Game Setup & Modifier Calculation

**1. Home Field Advantage**
- **Field Size Effects** (Home team only):
  - **Small Field**: +2 Power to all home players
  - **Large Field**: +2 Speed, +1 Agility to all home players
  - **Standard Field**: +1 Stamina to all home players

- **Intimidation Factor Calculation**:
  ```
  AttendanceRate = Min(100, 60 + FanLoyalty × 0.4)
  IntimidationFactor = (FanLoyalty × AttendanceRate) / 100
  CrowdNoiseDebuff = IntimidationFactor / 20 (Applied to away team Catching/Throwing)
  ```

**2. Camaraderie Effects**
- **Excellent (91-100)**: +2 Catching, +2 Agility, +3 Pass Accuracy
- **Good (76-90)**: +1 Catching, +1 Agility, +2 Pass Accuracy  
- **Average (41-75)**: No modifiers
- **Low (26-40)**: -1 Catching, -1 Agility, -1 Pass Accuracy
- **Poor (0-25)**: -2 Catching, -2 Agility, -3 Pass Accuracy, +2% Fumble Risk

**3. Tactical Modifiers**
Applied based on team's field size and tactical focus settings:
- **Field Size**: Affects pass range, stamina depletion, blocker range, power bonuses
- **Tactical Focus**: Modifies runner routes, passer risk tolerance, blocker aggression
- **Coach Effectiveness**: 0.5-1.5x multiplier based on head coach tactics rating

### Turn-Based Simulation Loop

**Game Phases**:
- **Early** (0-25% game time): Base difficulty
- **Middle** (25-75% game time): Standard play
- **Late** (75-90% game time): Increased intensity
- **Clutch** (90-100% game time): Maximum pressure, camaraderie effects amplified

**Action Resolution**:
1. **Team Selection**: Based on team strength ratio
2. **Player Selection**: Random from active roster
3. **Event Type**: Pass attempt, run attempt, or defensive play
4. **Skill Integration**: Player abilities modify success chances
5. **Camaraderie Impact**: Team chemistry affects all outcomes
6. **Fatigue Calculation**: Stamina affects performance over time

### Dynamic Commentary System

**Commentary Engine Features**:
- **200+ unique commentary variations**
- **Skill-specific commentary**: Different text for Juke Move, Truck Stick, Deadeye, etc.
- **Situational awareness**: Commentary adapts to game phase and score
- **Atmospheric integration**: Crowd noise and atmosphere affect commentary tone
- **Player-specific details**: Uses actual player names and racial identities

**Commentary Categories**:
- Run plays (standard, breakaway, power, skill-based)
- Pass plays (completion, incompletion, long passes, skill effects)
- Defensive plays (tackles, interceptions, skill demonstrations)
- Atmospheric events (crowd reactions, fatigue, momentum)

### Consumable System

**Match Limits**: Maximum 3 consumables per team per league match
**Activation Window**: Pre-match only (cannot activate during live simulation)

**Consumable Effects**:
- **Recovery Items**: Basic Stamina Drink, Advanced Recovery Serum, Medical Kits
- **Performance Boosters**: Speed Boost Tonic, Power Surge Potion, Champion's Blessing
- **Single-Game Only**: Effects last for one match, then consumed

### Atmospheric Effects System

**Crowd Dynamics**:
- **Crowd Noise**: 0-100 scale based on attendance and fan loyalty
- **Momentum Tracking**: Dynamic based on recent scoring and game flow
- **Weather Effects**: Wind and rain conditions (future expansion)

**Game Phase Detection**:
- Automatic phase progression based on game time percentage
- Clutch situations trigger enhanced camaraderie effects
- Late-game scenarios modify AI behavior and risk tolerance

### Advanced Tactical Effects

**Situational AI Adjustments**:
- **Winning Big**: Conservative play, reduced risk tolerance
- **Losing Big**: Desperation mode, increased aggression
- **Late & Close**: Clutch performance modifiers based on camaraderie

**Field Size Specialization**:
- **Large Field**: Favors speed and passing games
- **Small Field**: Emphasizes power and close-quarters play
- **Standard Field**: Balanced gameplay with slight stamina advantage

### Match Statistics & Tracking

**Real-Time Stats**:
- Possession percentage based on team strength
- Pass completion/incompletion ratios
- Interception and fumble tracking
- Player-specific performance metrics

**Post-Match Processing**:
- MVP calculation based on weighted performance stats
- Team camaraderie updates based on match results
- Injury risk assessment and stamina recovery
- Achievement and milestone tracking

### Player Skills Integration

**In-Match Skill Effects**:
- **Juke Move**: Enhanced running commentary, increased breakaway chance
- **Truck Stick**: Power-based tackle breaking, intimidation effects
- **Deadeye**: Improved pass accuracy, precision throwing commentary
- **Pocket Presence**: Enhanced protection from pressure, composure under fire
- **Pancake Block**: Devastating defensive hits, momentum-shifting tackles

**Skill Progression**: Skills can be upgraded through match experience and leadership development

### Technical Implementation

**Simulation Speed**: 3 real minutes per half (6 minutes total) for optimal user experience
**Event Generation**: 10-40 second intervals with randomized timing
**State Management**: Real-time game state updates for live match viewing
**Commentary Timing**: Synchronized with game events for immersive experience

---

## Integration with Game Economy

### Revenue Impact
Stadium atmosphere and attendance directly affect:
- Ticket sales (attendance × 25₡)
- Concession revenue (attendance × 8₡ × level)
- Parking revenue (30% attendance × 10₡ × level)
- VIP suite income (level × 5,000₡)
- Merchandise sales (attendance × 3₡ × level)

### Fan Loyalty Calculation
Updated end-of-season based on:
- Win percentage performance
- Championship achievements
- Stadium facility quality (lighting, screens)
- Historical team success

This comprehensive system creates an authentic, immersive fantasy sports experience where racial choices, team chemistry, tactical decisions, and stadium management all contribute to competitive success.