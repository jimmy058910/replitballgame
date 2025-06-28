# Realm Rivalry - Complete Financial Mechanics & Economy Documentation

## Overview
This document provides comprehensive details on all financial mechanics, calculations, and costs across Team Finances and Stadium systems for economy balancing.

## Currency Systems

### Primary Currency: Credits (₡)
- **Starting Amount**: 50,000 credits for new teams
- **Symbol**: ₡
- **Usage**: All major purchases, upgrades, and transactions

### Secondary Currency: Premium Gems (💎)
- **Starting Amount**: 0-100 gems (randomized for new teams)
- **Symbol**: 💎
- **Usage**: Premium items, faster progression, exclusive content
- **Conversion Rate**: ~10:1 credits to gems ratio

## Team Finances System

### Starting Economics (New Teams)
```javascript
// Default team finances on creation
{
  credits: 50000,                    // Base starting credits
  premiumCurrency: 0-100,           // Random starting gems
  ticketSales: 0,
  concessionSales: 0,
  jerseySales: 0,
  sponsorships: 0,
  playerSalaries: 0,
  staffSalaries: 0,
  facilities: 0,
  totalIncome: 0,
  totalExpenses: 0,
  netIncome: 0
}
```

### Income Streams
1. **Ticket Sales**: Stadium-dependent revenue
2. **Concession Sales**: Stadium facility-based
3. **Jersey Sales**: Merchandising revenue
4. **Sponsorships**: Team performance-based
5. **Match Revenue**: Per-game income

### Expense Categories
1. **Player Salaries**: Contract-based payments
2. **Staff Salaries**: Coaching/support staff costs
3. **Facilities**: Stadium maintenance and upgrades
4. **Operating Costs**: General team expenses

## Stadium Financial System

### Base Stadium Economics
- **Starting Capacity**: 5,000 seats
- **Starting Level**: 1
- **Initial Revenue Multiplier**: 100%

### Revenue Calculation Formula
```javascript
const baseMatchRevenue = stadium.capacity * 25; // $25 per seat average
const revenue = {
  matchDay: baseMatchRevenue * (revenueMultiplier / 100),
  concessions: capacity * 8 * facilitiesLevel.concessions,
  parking: capacity * 0.3 * 10 * facilitiesLevel.parking,
  vip: facilitiesLevel.vip * 5000,
  apparel: capacity * 3 * facilitiesLevel.merchandising,
  total: sum of all above
};
```

### Stadium Upgrade Costs
- **Capacity Expansion**: `currentCapacity * 10` credits per 5,000 seat increase
- **Premium Concessions**: 30,000 credits (25% revenue boost)
- **Expand Parking**: 25,000 credits (20% revenue boost)
- **Facility Upgrades**: Variable costs by type and level

### Stadium Facility Impact
Each facility level affects revenue multipliers:
- **Seating**: Direct capacity expansion
- **Concessions**: Multiplies concession revenue
- **Parking**: Affects parking revenue
- **Lighting**: Atmosphere and attendance
- **Screens**: Fan experience and revenue
- **VIP**: High-margin premium revenue
- **Merchandising**: Apparel sales multiplier

## Store System Pricing

### Equipment Categories
**Helmets**:
- Standard Leather Helmet: 1,000₡
- Gryllstone Plated Helm: 5,000₡ or 10💎
- Sylvan Barkwood Circlet: 5,000₡ or 10💎
- Umbral Cowl: 25💎 (premium only)
- Helm of Command: 50💎 (premium only)

**Boots**:
- Worn Cleats: 1,000₡
- Boots of the Gryll: 2,500₡ or 5💎
- Lumina's Light-Treads: 25💎 (premium only)

### Consumables
**Recovery Items**:
- Basic Energy Drink: 500₡
- Advanced Recovery Serum: 2,000₡ or 5💎
- Phoenix Elixir: 20💎 (premium only)

**Medical Kits**:
- Basic Medical Kit: 1,000₡
- Advanced Treatment: 3,000₡ or 10💎
- Miracle Cure: 30💎 (premium only)

**Performance Boosters**:
- Speed Boost Tonic: 1,500₡ or 3💎
- Power Surge Potion: 1,500₡ or 3💎
- Champion's Blessing: 15💎 (premium only)

### Tournament Entries
**Exhibition Matches**:
- Cost: 5,000₡ or 5💎
- Daily Limit: 3 entries

**Tournament Entry**:
- Division-based pricing:
  - Divisions 1-4: 2,500₡ or 8💎 (regular), 1,000₡ or 10💎 (daily)
  - Divisions 5-8: 1,200₡ or 8💎 (regular), 500₡ or 10💎 (daily)

## Tryout System Costs

### Basic Tryouts
- **Cost**: 50,000₡
- **Candidates**: 3 players
- **Quality**: Standard stat ranges

### Advanced Tryouts
- **Cost**: 150,000₡
- **Candidates**: 5 players
- **Quality**: Higher stat potential

## Marketplace Economics

### Player Trading
- **Listing Fee**: 2% of asking price
- **Minimum Team Size**: 10 players (to list)
- **Maximum Market Listings**: 3 players per team
- **Transaction Fee**: Paid by seller

### Auction System
- **Minimum Bid**: Set by seller
- **Buyout Options**: Available for instant purchase
- **Bidding Increments**: Dynamic based on price range

## Credit Costs Summary

### Major Expenses
- **Stadium Capacity Expansion**: 50,000₡+ (scales with current capacity)
- **Advanced Tryouts**: 150,000₡
- **Basic Tryouts**: 50,000₡
- **Premium Stadium Upgrades**: 25,000-30,000₡

### Regular Expenses
- **Tournament Entries**: 500-2,500₡
- **Exhibition Matches**: 5,000₡
- **Equipment**: 500-5,000₡
- **Consumables**: 500-3,000₡

### Revenue Streams
- **Match Revenue**: 450,000₡ average (15K capacity stadium)
- **Concession Revenue**: 240,000₡ average
- **Parking Revenue**: 90,000₡ average
- **VIP Revenue**: 5,000₡ base
- **Apparel Revenue**: 90,000₡ average

## Economy Balance Considerations

### Income vs Expenses Balance
- **Stadium ROI**: Capacity upgrades pay for themselves in ~1-2 matches
- **Tryout Investment**: High cost but essential for team building
- **Equipment Investment**: Moderate cost with permanent stat benefits

### Progression Curve
- Early game: Focus on basic team building (50K starting credits)
- Mid game: Stadium investment and advanced tryouts (100K+ range)
- Late game: Premium equipment and facility optimization (500K+ range)

### Credit Flow Management
- **Daily Income**: Match-dependent, varies by stadium level
- **Seasonal Expenses**: Player salaries, maintenance costs
- **Investment Opportunities**: Stadium upgrades, premium equipment

## Testing Values (Macomb Cougars)
- **Special Credit Bonus**: +250,000₡ for testing
- **Premium Currency Bonus**: +500💎 for testing
- Used for economy testing and balancing

## Recommended Economy Adjustments

### Short-term Balance
1. Monitor stadium upgrade ROI vs cost
2. Adjust tryout candidate quality vs price ratio
3. Balance tournament entry fees with rewards

### Long-term Economy Health
1. Ensure progression feels rewarding
2. Maintain scarcity for premium items
3. Create meaningful choices between credit spending options

This documentation provides the complete financial framework for balancing the Realm Rivalry economy across all systems.