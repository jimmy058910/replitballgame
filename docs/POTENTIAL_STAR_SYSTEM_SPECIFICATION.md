# Potential/Star Rating System - Unified Specification

## Overview
This document defines the standardized potential rating system used consistently across player generation, UI display, and gameplay simulation.

## Core Specification

### 1. Data Storage Format
- **Database Field**: `potentialRating` (Decimal/Float)
- **Range**: 0.5 to 5.0 (inclusive)
- **Precision**: One decimal place (e.g., 3.2, 4.7, 1.5)
- **Special Values**: No null values allowed, minimum 0.5 for worst players

### 2. Star Rating Conversion Rules

#### Full Star Thresholds
- **0.5-0.9**: ★☆☆☆☆ (1 star)
- **1.0-1.9**: ★★☆☆☆ (2 stars)
- **2.0-2.9**: ★★★☆☆ (3 stars)
- **3.0-3.9**: ★★★★☆ (4 stars)
- **4.0-5.0**: ★★★★★ (5 stars)

#### Half Star Logic (Optional Display)
- **X.0-X.4**: Full star only
- **X.5-X.9**: Full star + half star
- Example: 3.2 = ★★★☆☆, 3.7 = ★★★⭐☆ (3.5 stars visual)

### 3. Player Generation Standards

#### Rookie Generation (Tryouts)
- **Basic Tryout**: 0.5-3.0 potential (weighted toward 1.5-2.5)
- **Advanced Tryout**: 2.0-4.5 potential (weighted toward 3.0-4.0)
- **Elite Scouting**: 3.5-5.0 potential (weighted toward 4.0-4.5)

#### Free Agent Generation
- **Veteran Pool**: 1.0-3.5 potential (lower due to age)
- **Hidden Gems**: 2.5-4.5 potential (rare, requires good scouts)
- **Released Players**: 0.5-4.0 potential (varies by reason for release)

#### Generation Formula (Standardized)
```typescript
// Base potential generation
const generatePotential = (type: 'basic' | 'advanced' | 'elite' | 'veteran' | 'hidden'): number => {
  const ranges = {
    basic: { min: 0.5, max: 3.0, weight: 1.5 },
    advanced: { min: 2.0, max: 4.5, weight: 3.0 },
    elite: { min: 3.5, max: 5.0, weight: 4.0 },
    veteran: { min: 1.0, max: 3.5, weight: 2.0 },
    hidden: { min: 2.5, max: 4.5, weight: 3.5 }
  };
  
  const config = ranges[type];
  const random = Math.random();
  const weighted = Math.pow(random, 1 / config.weight); // Bias toward higher values
  const potential = config.min + (weighted * (config.max - config.min));
  
  return Math.round(potential * 10) / 10; // Round to 1 decimal place
};
```

### 4. UI Display Standards

#### Primary Display Format
- **Desktop/Full Views**: Show both stars and decimal (★★★☆☆ 3.2/5.0)
- **Mobile/Compact Views**: Stars only with tooltip showing decimal
- **List Views**: Decimal only for space efficiency (3.2)

#### Star Rendering Implementation
```typescript
const renderStarRating = (potential: number, showDecimal: boolean = true): JSX.Element => {
  const fullStars = Math.floor(potential);
  const hasHalfStar = (potential % 1) >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {/* Full stars */}
        {Array(fullStars).fill(0).map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-400">★</span>
        ))}
        {/* Half star */}
        {hasHalfStar && <span className="text-yellow-400">⭐</span>}
        {/* Empty stars */}
        {Array(emptyStars).fill(0).map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-400">☆</span>
        ))}
      </div>
      {showDecimal && (
        <span className="text-sm text-gray-400 ml-1">
          {potential.toFixed(1)}/5.0
        </span>
      )}
    </div>
  );
};
```

### 5. Gameplay Simulation Usage

#### Stat Cap Calculation
```typescript
// Convert potential to stat cap (40-point scale)
const getStatCap = (potentialRating: number): number => {
  return Math.round(potentialRating * 8); // 0.5 → 4, 5.0 → 40
};
```

#### Progression Probability Modifier
```typescript
// Potential affects progression chance
const getPotentialProgressionBonus = (potentialRating: number): number => {
  return (potentialRating - 0.5) * 3; // 0% to 13.5% bonus
};
```

#### Age-Potential Interaction
- **Young Players (16-22)**: Full potential effect
- **Prime Players (23-28)**: 90% potential effect
- **Veteran Players (29-34)**: 75% potential effect
- **Aging Players (35+)**: 50% potential effect

### 6. Scout "Fog of War" Effects

#### Scout Quality Impact on Potential Visibility
- **No Scout**: Show potential as "?" (completely hidden)
- **Poor Scout (1-15)**: Show potential ±0.5 accuracy (3.2 shown as 2.7-3.7)
- **Average Scout (16-25)**: Show potential ±0.3 accuracy (3.2 shown as 2.9-3.5)
- **Good Scout (26-35)**: Show potential ±0.1 accuracy (3.2 shown as 3.1-3.3)
- **Elite Scout (36-40)**: Show exact potential (3.2 shown as 3.2)

### 7. Contract Valuation Integration

#### Potential Premium Calculation
```typescript
const getPotentialContractMultiplier = (potential: number, age: number): number => {
  const basePotential = (potential - 0.5) / 4.5; // Normalize to 0-1
  const ageModifier = Math.max(0.5, (30 - age) / 15); // Young players get premium
  return 1 + (basePotential * ageModifier * 0.5); // Up to 50% premium
};
```

### 8. Error Prevention Rules

#### Validation Requirements
- All potential values must be between 0.5 and 5.0
- All potential values must be rounded to 1 decimal place
- No null or undefined potential values allowed
- Database constraints enforce range limits

#### Migration/Update Safety
- When updating existing players, preserve potential within valid range
- Convert any out-of-range values to nearest valid value
- Log any potential corrections for audit purposes

## Implementation Checklist

### Backend Requirements
- [ ] Standardize `generatePotential()` function across all player generation
- [ ] Update potential validation in player creation
- [ ] Implement scout accuracy modifiers for potential display
- [ ] Add potential-based progression modifiers
- [ ] Create potential-to-stat-cap conversion utility

### Frontend Requirements
- [ ] Implement unified `renderStarRating()` component
- [ ] Replace all custom potential calculations with standard formula
- [ ] Add responsive star display (desktop vs mobile)
- [ ] Implement scout-based potential accuracy display
- [ ] Update all player cards to use consistent potential display

### Database Requirements
- [ ] Add database constraints for potential range (0.5-5.0)
- [ ] Create migration to fix any out-of-range potential values
- [ ] Add index on potentialRating for efficient queries
- [ ] Implement audit logging for potential changes

### Testing Requirements
- [ ] Unit tests for potential generation ranges
- [ ] UI tests for star rendering accuracy
- [ ] Integration tests for scout accuracy effects
- [ ] Performance tests for potential-based calculations

## Current Implementation Issues

### Issues Found
1. **TaxiSquadManager.tsx**: Calculates potential from stats instead of using stored value
2. **Multiple star renderers**: Inconsistent implementations across components
3. **Generation inconsistency**: Different potential ranges in different generation methods
4. **No validation**: Missing range validation in player creation
5. **Scout integration missing**: Potential display not affected by scout quality

### Resolution Priority
1. **High**: Standardize potential generation across all player creation
2. **High**: Implement unified star rendering component
3. **Medium**: Add scout-based accuracy modifiers
4. **Medium**: Add database validation constraints
5. **Low**: Implement responsive display variations