# Staff System Schema & Gameplay Effects

## Overview
The staff system provides team management through specialized personnel who enhance player development, team performance, and operational efficiency. All staff attributes use a 1-40 scale with specific gameplay modifiers.

## Staff Types & Core Attributes

### 1. Head Coach
**Primary Attributes:**
- **Motivation** (1-40): Influences team morale and camaraderie building
- **Development** (1-40): Affects player progression rates and training effectiveness
- **Tactics** (1-40): Provides formation and strategic bonuses during matches

**Secondary Attributes:**
- **Age** (25-65): Affects contract costs and retirement probability
- **Level** (1-10): Overall staff tier affecting base salary and effectiveness caps

### 2. Trainers (4 Specializations)
**Primary Attribute:**
- **Teaching** (1-40): Core attribute affecting specific player stat development

**Trainer Specializations:**
- **Strength Trainer**: Focuses on Power and Stamina development
- **Speed Trainer**: Focuses on Speed and Agility development  
- **Technical Trainer**: Focuses on Throwing, Catching, and Kicking development
- **Mental Trainer**: Focuses on Leadership development

**Secondary Attributes:**
- **Age** (25-60): Affects contract costs and effectiveness
- **Level** (1-10): Training specialization depth

### 3. Recovery Specialist
**Primary Attribute:**
- **Physiology** (1-40): Medical expertise affecting injury management

**Secondary Attributes:**
- **Age** (28-65): Medical experience factor
- **Level** (1-10): Medical equipment and facility access

### 4. Scouts (2 Types)
**Primary Attributes:**
- **Talent_Identification** (1-40): Ability to find quality players
- **Potential_Assessment** (1-40): Accuracy in evaluating player potential

**Secondary Attributes:**
- **Age** (30-70): Experience and network connections
- **Level** (1-10): Scouting network reach and resources

## Attribute Caps & Progression

### Attribute Progression Formula
```
Base Progression Chance = 5% per season
Age Modifier = (45 - staff.age) × 0.1%
Level Modifier = staff.level × 0.5%
Team Success Modifier = (playoffs: +2%, championship: +5%)

Final Progression Chance = Base + Age + Level + Success
Maximum Attribute Increase = +1 per season per attribute
```

### Attribute Caps by Level
| Staff Level | Attribute Cap | Notes |
|-------------|---------------|-------|
| 1-2 | 25 | Entry-level staff |
| 3-4 | 30 | Experienced staff |
| 5-6 | 35 | Expert staff |
| 7-8 | 38 | Elite staff |
| 9-10 | 40 | Legendary staff |

### Age-Related Decline
**Decline Threshold:** Age 55+
**Decline Rate:** 2% chance per year to lose 1 point in primary attributes
**Retirement:** Automatic at age 70, voluntary chance increases 5% per year after 60

## Gameplay Modifiers & Effects

### Head Coach Effects

#### Team Progression Boost
```
Player Progression Bonus = Development × 0.5%
Base Player Progression = 15%
Enhanced Progression = Base + Coach Bonus
Example: Development 30 = +15% player progression (30 × 0.5%)
```

#### Camaraderie Building
```
Seasonal Camaraderie Gain = Motivation × 0.25
Example: Motivation 32 = +8 team camaraderie per season
```

#### Tactical Formation Bonus
```
Formation Effectiveness = (Motivation + Development + Tactics) ÷ 3 × 0.1%
Maximum Tactical Bonus = +4% to all team stats
Example: Average 30 stats = +3% team performance bonus
```

### Trainer Effects

#### Stat Development Bonus
```
Training Bonus = Teaching × 0.3% per relevant stat
Applicable Stats by Trainer Type:
- Strength: Power, Stamina
- Speed: Speed, Agility  
- Technical: Throwing, Catching, Kicking
- Mental: Leadership

Example: Teaching 25 Strength Trainer = +7.5% Power/Stamina progression
```

#### Training Session Efficiency
```
Training Session Success Rate = 50% + (Teaching × 1.25%)
Maximum Success Rate = 100%
Example: Teaching 30 = 87.5% training session success rate
```

### Recovery Specialist Effects

#### Daily Injury Healing
```
Daily Recovery Points = Physiology × 0.5
Base Recovery = 2 points per day
Enhanced Recovery = Base + Specialist Bonus
Example: Physiology 28 = 16 recovery points per day (2 + 14)
```

#### Stamina Recovery Enhancement
```
Stamina Recovery Bonus = Physiology × 0.25%
Base Daily Stamina Recovery = 20%
Enhanced Recovery = Base + Specialist Bonus
Example: Physiology 32 = +8% daily stamina recovery
```

#### Injury Prevention
```
Injury Prevention = Physiology × 0.1% per game
Base Injury Rate = 2.5% per game
Reduced Injury Rate = Base - Prevention
Example: Physiology 25 = 2.5% injury prevention (0% minimum)
```

### Scout Effects

#### Tryout Quality Enhancement
```
Tryout Pool Quality = Talent_Identification × 0.05
Better Quality = Higher potential players in tryout pools
Bonus Prospects = (Talent_ID ÷ 10) additional prospects per tryout
Example: Talent_ID 30 = +3 additional prospects per tryout
```

#### Market Intelligence (Fog of War Reduction)
```
Scout Accuracy Levels:
- Elite (35-40): ±0.0 potential accuracy, full player info
- Good (25-34): ±0.1 potential accuracy, most player info
- Average (15-24): ±0.3 potential accuracy, basic player info
- Poor (5-14): ±0.5 potential accuracy, limited player info
- None (1-4): Hidden potential, name/position only

Market Evaluation = (Talent_ID + Potential_Assessment) ÷ 2
```

#### Hidden Gem Discovery
```
Hidden Gem Chance = (Talent_Identification × 0.2%) per free agent check
Hidden Gems = Players with potential 1+ star higher than market rating
Maximum Discovery Rate = 8% per free agent generation
Example: Talent_ID 35 = 7% chance to find hidden gems
```

## Staff Contracts & Economics

### Salary Calculation
```
Base Salary = Staff Level × 1000₡
Attribute Bonus = (Sum of Primary Attributes - 20) × 50₡
Age Factor = (50 - Age) × 10₡ (minimum 0)
Market Demand = Division Level × 200₡

Total Salary = Base + Attribute + Age + Market
Contract Length = 1-3 years (longer = 10% discount per year)
```

### Contract Renewal Rules
- **Auto-Renewal:** Staff with 25+ primary attributes
- **Negotiation Required:** Staff with exceptional performance bonuses
- **Release Penalty:** 50% of remaining contract value
- **Poaching Protection:** 25% salary premium to prevent departures

## Staff Development Strategies

### Optimal Staff Composition
**Small Budget Teams (Division 6-8):**
- Head Coach: Focus on Development over Tactics
- 2 Trainers: Strength + Technical for role flexibility
- Basic Recovery Specialist (Physiology 15-20)
- 1 Scout: Balanced Talent_ID/Potential_Assessment

**Mid-Tier Teams (Division 3-5):**
- Head Coach: Balanced Motivation/Development/Tactics
- 3 Trainers: Strength, Speed, Technical specialization
- Advanced Recovery Specialist (Physiology 25-30)
- 2 Scouts: Specialist + Market Intelligence focus

**Elite Teams (Division 1-2):**
- Head Coach: 35+ in all primary attributes
- 4 Trainers: Full specialization including Mental trainer
- Elite Recovery Specialist (Physiology 35+)
- 2 Elite Scouts: Both 35+ attributes for complete market control

### Staff Progression Investment
**Priority Order:**
1. **Head Coach Development** - Affects entire team
2. **Recovery Specialist Physiology** - Injury prevention saves money
3. **Primary Trainer Teaching** - Matches team needs
4. **Scout Talent_Identification** - Long-term roster building
5. **Secondary Trainers** - Depth and flexibility

## Integration with Game Systems

### Player Development Pipeline
```
Base Player Progression = 15%
+ Head Coach Development Bonus = +0-20%
+ Trainer Teaching Bonus = +0-12% (per relevant stat)
+ Team Success Modifier = +0-5%
= Total Progression Rate = 15-52% per season
```

### Injury Management System
```
Base Injury Rate = 2.5% per game
- Recovery Specialist Prevention = 0-4%
= Final Injury Rate = 0.5-2.5% per game

Base Recovery = 2 points per day
+ Recovery Specialist Bonus = +0-20 points
= Total Recovery = 2-22 points per day
```

### Market Advantage System
```
Market Information Access:
- No Scouts: Names and ages only
- Basic Scouts: Basic stats visible
- Good Scouts: Full stats + approximate potential
- Elite Scouts: Complete player profiles + exact potential

Hidden Gem Discovery Rate: 0-8% per free agent check
Tryout Quality Bonus: 0-4 additional prospects per tryout
```

## Performance Metrics & Analytics

### Staff Effectiveness Tracking
**Head Coach Metrics:**
- Team progression rate vs league average
- Camaraderie improvement per season
- Win rate improvement with tactical bonuses

**Trainer Metrics:**
- Player stat gains in specialized areas
- Training session success rates
- Comparative development vs teams without trainers

**Recovery Specialist Metrics:**
- Average injury recovery time
- Team injury rate vs league average
- Stamina management effectiveness

**Scout Metrics:**
- Quality of discovered players vs market average
- Accuracy of player evaluations
- Hidden gem discovery rate and success

### ROI Calculations
```
Staff ROI = (Performance Improvement Value - Staff Salary) ÷ Staff Salary

Performance Value Sources:
- Faster player development = Higher player values
- Fewer injuries = Reduced medical costs + sustained performance
- Better scouting = Cheaper quality acquisitions
- Higher win rate = Better revenue and prizes
```

## Version History
- **v1.0** (July 28, 2025): Initial comprehensive staff schema documentation
- **Current**: All staff mechanics operational with 1-40 attribute scale