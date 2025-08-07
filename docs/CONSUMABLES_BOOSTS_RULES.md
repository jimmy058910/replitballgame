# Consumables & Boosts System Rules

## Overview
The consumables system provides temporary advantages through strategic resource management while maintaining competitive balance. All rules are server-enforced to prevent exploitation.

## Hard Limits & Restrictions

### Per-Match Limits (Server Enforced)
- **League Matches**: Maximum 3 consumables per team per match
- **Tournament Matches**: Maximum 3 consumables per team per match  
- **Exhibition Matches**: No consumable restrictions (practice matches)
- **Pre-Match Only**: Consumables must be activated before match simulation begins
- **No Mid-Match Usage**: Cannot activate consumables during live simulation

### Daily Usage Limits (Server Enforced)
- **Per Team**: Maximum 10 consumables per day across all match types
- **Per Player**: Maximum 2 consumables targeting same player per day
- **Recovery Items**: Maximum 5 recovery consumables per team per day
- **Performance Boosters**: Maximum 8 performance boosters per team per day
- **Reset Time**: Daily limits reset at 3:00 AM EDT with season advancement

### Inventory Management
- **Total Carry Limit**: 50 consumable items per team inventory
- **Per-Item Stack Limit**: Maximum 10 of same consumable type
- **Overflow Protection**: Purchase attempts blocked when at capacity
- **Auto-Cleanup**: Expired items automatically removed from inventory

## Expiration & Timing Rules

### Item Durability (Server Tracked)
- **Basic Consumables**: 7 days from purchase
- **Premium Consumables**: 14 days from purchase  
- **Event Items**: 3 days from acquisition
- **Gift Items**: No expiration (permanent)

### Effect Duration
- **Single Match**: All consumable effects last exactly one match
- **No Persistence**: Effects automatically cleared after match completion
- **No Carry-Over**: Cannot stack effects across multiple matches
- **Tournament Exception**: Effects persist through tournament bracket progression (same day)

## Stacking & Replacement Rules (Server Enforced)

### Effect Stacking Policy
**REPLACEMENT SYSTEM** - No stacking allowed to prevent power creep:

#### Same Category Replacement
- **Recovery + Recovery**: New effect replaces previous (no stacking)
- **Performance + Performance**: New effect replaces previous (no stacking)
- **Stat Boost + Stat Boost**: Higher value replaces lower value

#### Cross-Category Combination
- **Recovery + Performance**: Both effects apply simultaneously
- **Single-Stat + Multi-Stat**: Multi-stat boost replaces single-stat component
- **Temporary + Equipment**: Consumable effects stack with permanent equipment bonuses

### Specific Stacking Examples
```
❌ BLOCKED: Speed Boost Tonic + Fleet Foot Elixir = Replacement, not +6 speed
❌ BLOCKED: Power Surge + Strength Serum = Replacement, not +7 power  
✅ ALLOWED: Stamina Drink + Speed Boost = Different categories, both apply
✅ ALLOWED: Champion's Blessing + Equipment Speed Bonus = Temporary + permanent stack
```

## Assignment Logic (Server Enforced)

### Pre-Match Validation
- **Inventory Check**: Verify team owns consumable with quantity > 0
- **Usage Limit Check**: Validate against daily/match limits before activation
- **Player Eligibility**: Ensure target player is on active roster (not taxi squad)
- **Match Type Validation**: Block consumables in exhibition if item is premium-only

### Activation Requirements
- **Team Authorization**: Only team owner/manager can activate consumables
- **Formation Lock**: Cannot activate after formation is locked for match
- **Live Match Block**: Activation disabled once match simulation begins
- **Quantity Deduction**: Server immediately reduces inventory quantity upon activation

### Effect Application Priority
1. **Equipment Bonuses** (permanent, lowest priority)
2. **Recovery Consumables** (temporary, medium priority)  
3. **Performance Boosters** (temporary, highest priority)
4. **Event Special Items** (temporary, override priority)

## Categories & Effects

### Recovery Items (Focus: Sustainability)
- **Basic Stamina Drink** (100₡): +10% stamina recovery, +2 stamina for match
- **Advanced Recovery Serum** (250₡): +15% stamina recovery, +3 stamina, +1 speed
- **Medical Kit** (200₡): +5 injury recovery points, 50% injury prevention
- **Premium Recovery Pack** (500₡): Full stamina restoration, +10 injury recovery

### Performance Boosters (Focus: Match Impact)
- **Speed Boost Tonic** (150₡): +3 speed, +2 agility for match
- **Power Surge Potion** (175₡): +4 power, +2 stamina for match
- **Champion's Blessing** (400₡): +1 all stats, +2 throwing/catching for match
- **Focus Enhancer** (300₡): +3 throwing, +2 leadership for match

### Special Event Items (Focus: Rare Advantages)
- **Victory Elixir** (1000₡): +2 all stats, immunity to intimidation effects  
- **Legendary Brew** (2000₡): +5% all team stats, +20% fan loyalty for match
- **Tournament Fuel** (750₡): +3 all stats, tournament matches only

## Server Enforcement Points

### Real-Time Validation
- **API Endpoint Protection**: All consumable activation goes through `/api/consumables/activate`
- **Database Constraints**: Foreign key validation ensures inventory ownership
- **Concurrent Usage Prevention**: Atomic transactions prevent race conditions
- **Audit Trail**: Complete log of consumable usage for analysis

### Anti-Exploit Measures
- **Client-Side Bypass Protection**: All validation occurs server-side  
- **Inventory Synchronization**: Real-time inventory updates prevent phantom usage
- **Effect Duration Tracking**: Server tracks exact effect expiration times
- **Usage Pattern Detection**: Flag suspicious consumable usage patterns

### Error Handling
- **Graceful Degradation**: Failed consumable activation doesn't block match start
- **Clear Error Messages**: Specific failure reasons returned to client
- **Automatic Rollback**: Failed activations restore inventory quantities
- **Fallback Behavior**: Matches proceed normally without consumable effects if system fails

## Balance Philosophy

### No Pay-to-Win Design
- **Credit Accessibility**: All consumables purchasable with in-game credits
- **Gem Convenience**: Gems provide faster acquisition, not exclusive access
- **Exhibition Training**: Free consumable testing in exhibition matches
- **Skill Over Items**: Consumables enhance strategy, don't replace player skill

### Strategic Resource Management
- **Timing Decisions**: When to use limited consumables for maximum impact
- **Opponent Analysis**: Counter enemy strategies with appropriate consumables  
- **Season Planning**: Manage consumable inventory across 17-day season cycle
- **Risk vs Reward**: Premium consumables cost more but provide greater advantages

## Implementation Checklist

### Backend Requirements
- [x] Match consumable limits (3 per team per match)
- [ ] Daily usage limits and tracking
- [ ] Inventory carry limits enforcement  
- [ ] Expiration date tracking and cleanup
- [ ] Effect stacking/replacement logic
- [ ] Cross-category combination rules
- [ ] Anti-exploit validation layers

### Frontend Requirements
- [ ] Consumable activation interface with limit display
- [ ] Inventory management with expiration warnings
- [ ] Effect preview before activation
- [ ] Usage history and analytics
- [ ] Error messaging for blocked actions
- [ ] Pre-match consumable planning interface

### Database Schema
- [ ] Daily usage tracking table
- [ ] Effect stacking rules configuration
- [ ] Expiration date fields on inventory items
- [ ] Consumable activation audit log
- [ ] Match consumable effects tracking